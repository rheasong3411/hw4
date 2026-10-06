"""Checks the honesty guard without calling the real model.

A scripted FunctionModel plays the agent: it looks up a price, then answers
with a made-up price, and the guard must send it back to correct itself.

Run from the backend folder:

    python tests/test_honesty_guard.py
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic_ai.messages import ModelResponse, RetryPromptPart, ToolCallPart  # noqa: E402
from pydantic_ai.models.function import AgentInfo, FunctionModel  # noqa: E402

import agent as shop_agent  # noqa: E402
import audit  # noqa: E402

# Keep scripted test runs out of the real audit trail.
audit.AUDIT_PATH = Path(__file__).resolve().parent / ".test_audit_trail.json"

PRODUCT = "boola-boola-t-shirt"  # $32.00 in the database


def scripted_model(wrong_replies: int) -> FunctionModel:
    """Look up the price, give `wrong_replies` answers quoting $29, then $32."""
    attempts = {"final": 0}

    def respond(messages, info: AgentInfo) -> ModelResponse:
        output_tool = info.output_tools[0].name
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart("get_price", {"product_id": PRODUCT})])
        attempts["final"] += 1
        price = "$29" if attempts["final"] <= wrong_replies else "$32"
        return ModelResponse(
            parts=[
                ToolCallPart(
                    output_tool,
                    {"reply": f"The Boola Boola T Shirt is {price}.", "product_ids": [PRODUCT]},
                )
            ]
        )

    return FunctionModel(respond)


async def run(wrong_replies: int):
    deps = shop_agent.ChatDeps(shopper_text="How much is the Boola Boola tee?")
    with shop_agent.agent.override(model=scripted_model(wrong_replies)):
        result = await shop_agent.agent.run("How much is the Boola Boola tee?", deps=deps)
    retries = [
        part.content
        for message in result.all_messages()
        for part in message.parts
        if isinstance(part, RetryPromptPart)
    ]
    return result.output, retries


async def main() -> None:
    # 1. A wrong price is caught and corrected.
    output, retries = await run(wrong_replies=1)
    assert output.reply == "The Boola Boola T Shirt is $32.", output.reply
    assert len(retries) == 1 and "$29 does not match" in str(retries[0]), retries
    print("PASS wrong price -> guard retry ->", repr(output.reply))
    print("     retry message:", str(retries[0])[:140], "...")

    # 2. A correct price passes with no retry.
    output, retries = await run(wrong_replies=0)
    assert not retries and output.reply.endswith("$32."), (output, retries)
    print("PASS correct price -> no retry")

    # 3. A model that never fixes it gets the safe fallback reply, not the wrong price.
    with shop_agent.agent.override(model=scripted_model(wrong_replies=99)):
        response = await shop_agent.run_chat("How much is the Boola Boola tee?", history=[])
    assert response.reply == shop_agent.UNVERIFIED_REPLY and not response.products, response
    print("PASS never corrected -> fallback reply:", repr(response.reply[:60]), "...")

    # 4. Figures the shopper gave are allowed ("under $60").
    deps = shop_agent.ChatDeps(shopper_text="anything under $60?")
    reply = shop_agent.ShopReply(reply="Everything here is under $60.")

    class Ctx:  # the guard only reads ctx.deps
        pass

    ctx = Ctx()
    ctx.deps = deps
    assert shop_agent.honesty_guard(ctx, reply) is reply
    print("PASS shopper's own figure ($60) allowed")

    # 5. A reply that claims more items than it shows is caught; a true count passes.
    ids = ["basic-hoodie-big-yale", "crew-left-chest-hoodie", "fencing-left-chest-hoodie"]
    deps = shop_agent.ChatDeps(shopper_text="what hoodies do you have?", known_prices={68.0})
    ctx.deps = deps
    try:
        shop_agent.honesty_guard(ctx, shop_agent.ShopReply(reply="We have 28 hoodies at $68.", product_ids=ids))
        raise AssertionError("an item count of 28 with 3 cards was not caught")
    except shop_agent.ModelRetry as retry:
        assert "says 28 items" in str(retry), retry
    true_count = shop_agent.ShopReply(reply="Here are 3 hoodies at $68.", product_ids=ids)
    assert shop_agent.honesty_guard(ctx, true_count) is true_count
    print("PASS '28 hoodies' with 3 cards caught; '3 hoodies' passes")

    # 6. The full run_chat path answers and appends an audit entry.
    before = len(json.loads(audit.AUDIT_PATH.read_text())) if audit.AUDIT_PATH.exists() else 0
    with shop_agent.agent.override(model=scripted_model(wrong_replies=0)):
        response = await shop_agent.run_chat("How much is the Boola Boola tee?", history=[])
    entries = json.loads(audit.AUDIT_PATH.read_text())
    last = entries[-1]
    assert response.reply.endswith("$32.") and response.products[0].product_id == PRODUCT, response
    assert len(entries) == before + 1, "audit trail did not grow by exactly one entry"
    assert last["stop_reason"] == "final_answer" and last["tool_calls"][0]["tool"] == "get_price", last
    print("PASS run_chat answers and appends an audit entry:", last["stop_reason"], [c["tool"] for c in last["tool_calls"]])

    # 7. A crisis message gets the support reply without calling the model.
    response = await shop_agent.run_chat("I feel hopeless and want to die", history=[])
    assert response.reply == shop_agent.CRISIS_REPLY and "988" in response.reply
    assert json.loads(audit.AUDIT_PATH.read_text())[-1]["stop_reason"] == "crisis_support"
    print("PASS crisis message -> 988 support reply, stop_reason crisis_support")
    print("guard stats:", shop_agent.GUARD_STATS)


if __name__ == "__main__":
    asyncio.run(main())
