import { useMemo, useState } from "react";

/* ========= 型定義 ========= */

type UploadResult =
  | { ok: true; image_file_id: string; image_url: string }
  | { ok: false; error: string };

type ExpenseResult =
  | { ok: true }
  | { ok: false; error: string };

type Category = "dining_out" | "groceries" | "other";

/* ========= 定数 ========= */

const GAS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxdq4fcooY1RC-BH8v4Nw7NgoXiNSwp1DotEv2U2eqFmkGI2L9ZCH0FoXWAamVPt_Hm/exec";

/* ========= ユーティリティ ========= */

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
      if (idx < 0) {
        reject(new Error("InvalidDataURL"));
        return;
      }
      resolve(result.slice(idx + 1));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * GAS doPost は e.parameter.payload を JSON.parse しているため
 * application/x-www-form-urlencoded で payload=JSON を送る
 */
async function postPayload<T>(
  endpoint: string,
  payloadObj: unknown
): Promise<T> {
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify(payloadObj));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`NonJSONResponse: ${text.slice(0, 200)}`);
  }
}

/* ========= App ========= */

export default function App() {
  const [date, setDate] = useState<string>(todayYYYYMMDD());
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<Category>("groceries");
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<
    "idle" | "uploading" | "saving" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  /* ========= Saveボタン活性条件 ========= */
  const canSubmit = useMemo(() => {
    const n = Number(amount);
    return (
      date.trim() !== "" &&
      isFinite(n) &&
      n > 0 &&
      status !== "uploading" &&
      status !== "saving"
    );
  }, [date, amount, status]);

  /* ========= 送信処理 ========= */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setStatus("idle");

    const n = Number(amount);
    if (!isFinite(n) || n <= 0) {
      setStatus("error");
      setMessage("金額が不正です");
      return;
    }

    try {
      let image_url = "";
      let image_file_id = "";

      /* --- 画像がある場合のみ upload --- */
      if (file) {
        setStatus("uploading");

        const base64 = await fileToBase64(file);
        const uploadPayload = {
          action: "upload",
          date,
          amount: n,
          mime_type: file.type || "image/jpeg",
          base64,
        };

        const uploadRes = await postPayload<UploadResult>(
          GAS_ENDPOINT,
          uploadPayload
        );

        if (!uploadRes.ok) {
          setStatus("error");
          setMessage(`Upload failed: ${uploadRes.error}`);
          return;
        }

        image_url = uploadRes.image_url;
        image_file_id = uploadRes.image_file_id;
      }

      /* --- expense は必ず実行 --- */
      setStatus("saving");

      const expensePayload = {
        action: "expense",
        date,
        amount: n,
        category,
        image_url,
        image_file_id,
      };

      const expenseRes = await postPayload<ExpenseResult>(
        GAS_ENDPOINT,
        expensePayload
      );

      if (!expenseRes.ok) {
        setStatus("error");
        setMessage(`Expense failed: ${expenseRes.error}`);
        return;
      }

      setStatus("done");
      setMessage("保存しました ✅");

      setAmount("");
      setCategory("groceries");
      setFile(null);
    } catch (err) {
      setStatus("error");
      setMessage(String(err instanceof Error ? err.message : err));
    }
  }

  /* ========= UI ========= */

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "32px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>
        家計簿（最小UI）
      </h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <option value="groceries">groceries</option>
            <option value="dining_out">dining_out</option>
            <option value="other">other</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Receipt image（任意）</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <small style={{ opacity: 0.8 }}>
              {file.name}（{Math.round(file.size / 1024)} KB）
            </small>
          )}
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "10px 12px",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {status === "uploading"
            ? "Uploading..."
            : status === "saving"
            ? "Saving..."
            : "Save"}
        </button>

        {message && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: status === "error" ? "#ffe5e5" : "#e9ffe5",
              border: "1px solid rgba(0,0,0,0.1)",
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
