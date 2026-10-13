/**
 * Renders a question's text. Some questions carry line breaks and markdown
 * tables (e.g. "| Hewan | Banyak Siswa |"); plain text would collapse them
 * into one unreadable line, so tables become real tables and line breaks
 * are kept.
 */
type Block = { kind: "text"; lines: string[] } | { kind: "table"; rows: string[][] };

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    if (line.startsWith("|")) {
      // Skip the |---|---| separator row.
      if (/^\|[\s|:-]+\|$/.test(line)) continue;
      const cells = line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      if (last?.kind === "table") last.rows.push(cells);
      else blocks.push({ kind: "table", rows: [cells] });
    } else if (line === "") {
      if (last?.kind === "text" && last.lines.length > 0) blocks.push({ kind: "text", lines: [] });
    } else if (last?.kind === "text") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "text", lines: [line] });
    }
  }
  return blocks.filter((block) => block.kind === "table" || block.lines.length > 0);
}

export default function QuestionText({ text, className }: { text: string; className: string }) {
  const blocks = parse(text);
  if (blocks.length === 1 && blocks[0].kind === "text" && blocks[0].lines.length === 1) {
    return <h2 className={className}>{text}</h2>;
  }
  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.kind === "table" ? (
          <table
            key={i}
            className="my-3 w-full max-w-md border-collapse overflow-hidden rounded-xl font-sans text-base"
          >
            <thead>
              <tr>
                {block.rows[0].map((cell, c) => (
                  <th key={c} className="border border-line bg-fog px-3 py-2 text-left font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.slice(1).map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-line px-3 py-2 tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p key={i} className={i > 0 ? "mt-3" : undefined}>
            {block.lines.map((line, l) => (
              <span key={l}>
                {l > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
