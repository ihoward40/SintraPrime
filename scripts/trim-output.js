let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(input);

    // Golden-vector suite shape
    if (Array.isArray(parsed?.vectors)) {
      const vectors = parsed.vectors.map((v) => ({
        name: v?.name,
        ok: v?.ok,
        stage: v?.stage,
        kind: v?.kind,
        status: v?.status,
        error: v?.error,
      }));

      process.stdout.write(
        JSON.stringify(
          {
            ok: parsed?.ok,
            failed: parsed?.failed,
            total: parsed?.total,
            threadId: parsed?.threadId,
            vectors,
          },
          null,
          2
        )
      );
      return;
    }

    const previewSource = parsed?.response?.response;
    const preview =
      typeof previewSource === "string"
        ? previewSource.slice(0, 200)
        : previewSource ?? parsed?.response;

    process.stdout.write(
      JSON.stringify(
        {
          status: parsed?.status,
          threadId: parsed?.threadId ?? parsed?.response?.threadId,
          preview,
        },
        null,
        2
      )
    );
  } catch {
    process.stdout.write(input);
  }
});
