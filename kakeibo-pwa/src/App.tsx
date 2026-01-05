import { useMemo, useState } from "react";

const TOKEN = import.meta.env.VITE_KAKEIBO_TOKEN as string | undefined;
type Category = "dining_out" | "groceries" | "other";

const GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxdq4fcooY1RC-BH8v4Nw7NgoXiNSwp1DotEv2U2eqFmkGI2L9ZCH0FoXWAamVPt_Hm/exec";

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReadError"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      if (idx < 0) return reject(new Error("InvalidDataURL"));
      resolve(result.slice(idx + 1));
    };
    reader.readAsDataURL(file);
  });
}

function submitPayloadByForm(endpoint: string, payload: unknown) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = endpoint;
  form.target = "_top";
  form.style.display = "none";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "payload";
  input.value = JSON.stringify(payload);

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

export default function App() {
  const [date, setDate] = useState<string>(todayYYYYMMDD());
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<Category>("groceries");
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<"idle" | "reading">("idle");
  const [message, setMessage] = useState<string>("");

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    return date.trim() !== "" && isFinite(n) && n > 0 && status !== "reading";
  }, [date, amount, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const n = Number(amount);
    if (!isFinite(n) || n <= 0) {
      setMessage("金額が不正です");
      return;
    }

    setStatus("reading");

    const basePayload: any = {
      action: "expense_with_upload",
      date,
      amount: n,
      category,
      return_to: `${window.location.origin}/result`,
      token: TOKEN || undefined,
    };

    // 画像は任意：あればbase64を詰める
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        basePayload.base64 = base64;
        basePayload.mime_type = file.type || "image/jpeg";
      } catch {
        // 画像読み取り失敗：画像なしで送る（あなたのテストHTMLと同じ挙動）
        // ここは「知らせたい」なら setMessage して送信中断もできる
      }
    }

    // ここで遷移が起きる（GASが/resultへ戻してくれる想定）
    submitPayloadByForm(GAS_ENDPOINT, basePayload);
  }

  return (
    <div style={{ maxWidth: 520, margin: "32px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>家計簿（入力）</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Amount (AUD)</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 12.50"
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            <option value="groceries">groceries</option>
            <option value="dining_out">dining_out</option>
            <option value="other">other</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Receipt image（任意）</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <button type="submit" disabled={!canSubmit} style={{ padding: "10px 12px" }}>
          {status === "reading" ? "Preparing..." : "Save"}
        </button>

        {message && (
          <div style={{ padding: 12, borderRadius: 8, background: "#ffe5e5", whiteSpace: "pre-wrap" }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
