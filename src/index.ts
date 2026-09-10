import { createApp } from "./api/server";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp();
app.listen(PORT, () => {
  console.log(`LLD Practice Platform running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      "NOTE: ANTHROPIC_API_KEY is not set. LLM feedback will use a mock evaluator. See README."
    );
  }
});
