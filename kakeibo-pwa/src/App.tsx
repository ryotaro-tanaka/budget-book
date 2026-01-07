import React, { useMemo, useRef, useState } from "react";

const TOKEN = import.meta.env.VITE_KAKEIBO_TOKEN as string | undefined;

type Category = "dining_out" | "groceries" | "other";

type ExpenseWithUploadBase = {
  action: "expense_with_upload";
  date: string;
  amount: number;
  category?: Category;
  return_to: string;
  token?: string;
};

type ExpenseWithUploadWithImage = ExpenseWithUploadBase & {
  base64: string;
  mime_type: string;
};

type ExpenseWithUploadRequest = ExpenseWithUploadBase | ExpenseWithUploadWithImage;

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

function submitPayloadByForm(endpoint: string, payload: ExpenseWithUploadRequest) {
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

function formatAud(amount: string): string {
  const n = Number(amount);
  if (!isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return "";
  }
}

export default function App() {
  const [date, setDate] = useState<string>(todayYYYYMMDD());
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<Category>("groceries");
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<"idle" | "reading">("idle");
  const [message, setMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    return date.trim() !== "" && isFinite(n) && n > 0 && status !== "reading";
  }, [date, amount, status]);

  const amountPreview = useMemo(() => formatAud(amount), [amount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const n = Number(amount);
    if (!isFinite(n) || n <= 0) {
      setMessage("Invalid amount (enter a number greater than 0)");
      return;
    }

    setStatus("reading");

    let payload: ExpenseWithUploadRequest = {
      action: "expense_with_upload",
      date,
      amount: n,
      category,
      return_to: `${window.location.origin}/result`,
      token: TOKEN || undefined,
    };

    // Optional image
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        payload = {
          ...payload,
          base64,
          mime_type: file.type || "image/jpeg",
        };
      } catch {
        // Requirement: if user selected an image but reading fails, notify and send without image
        setMessage("Failed to read image; sending without image.");
      }
    }

    // Navigates away (GAS should redirect back to /result)
    submitPayloadByForm(GAS_ENDPOINT, payload);
  }

  function clearImage() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const styles = {
    page: {
      minHeight: "100vh",
      padding: "28px 16px 40px",
      background:
        "radial-gradient(1200px 600px at 50% -10%, rgba(0,0,0,0.06), transparent 60%), #f6f7f9",
      color: "#0f172a",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
      WebkitFontSmoothing: "antialiased" as const,
      MozOsxFontSmoothing: "grayscale" as const,
    },
    container: {
      maxWidth: 520,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    titleWrap: { display: "grid", gap: 4 },
    title: { fontSize: 22, fontWeight: 800, letterSpacing: -0.3, margin: 0 },
    subtitle: { fontSize: 13, opacity: 0.7, margin: 0 },
    card: {
      background: "rgba(255,255,255,0.82)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(15, 23, 42, 0.08)",
      borderRadius: 18,
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
      padding: 16,
    },
    form: { display: "grid", gap: 12 },
    field: { display: "grid", gap: 8 },
    labelRow: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 10,
    },
    label: { fontSize: 12, fontWeight: 700, letterSpacing: 0.2, opacity: 0.75 },
    hint: { fontSize: 12, opacity: 0.6 },
    control: {
      width: "100%",
      height: 48,
      borderRadius: 14,
      border: "1px solid rgba(15, 23, 42, 0.12)",
      background: "rgba(255,255,255,0.95)",
      padding: "0 12px",
      fontSize: 16, // iOS zoom prevention
      outline: "none",
      boxSizing: "border-box" as const,
      appearance: "none" as const,
      WebkitAppearance: "none" as const,
    },
    controlFocus: {
      boxShadow: "0 0 0 4px rgba(2, 132, 199, 0.18)",
      borderColor: "rgba(2, 132, 199, 0.55)",
    },
    selectWrap: { position: "relative" as const },
    selectChevron: {
      position: "absolute" as const,
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none" as const,
      opacity: 0.45,
      fontSize: 14,
    },
    fileRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: 12,
      borderRadius: 14,
      border: "1px dashed rgba(15, 23, 42, 0.16)",
      background: "rgba(255,255,255,0.65)",
    },
    fileMeta: { display: "grid", gap: 2, minWidth: 0 },
    fileName: {
      fontSize: 13,
      fontWeight: 700,
      overflow: "hidden",
      textOverflow: "ellipsis" as const,
      whiteSpace: "nowrap" as const,
    },
    fileSub: { fontSize: 12, opacity: 0.65 },
    fileBtn: {
      border: "1px solid rgba(15, 23, 42, 0.14)",
      background: "rgba(255,255,255,0.9)",
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 13,
      fontWeight: 700,
    },
    primaryBtn: {
      width: "100%",
      height: 50,
      borderRadius: 16,
      border: "0",
      background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.88))",
      color: "white",
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: 0.2,
      boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
      cursor: "pointer",
    },
    primaryBtnDisabled: {
      opacity: 0.45,
      cursor: "not-allowed",
      boxShadow: "none",
    },
    alert: {
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(239, 68, 68, 0.25)",
      background: "rgba(254, 226, 226, 0.85)",
      color: "#7f1d1d",
      whiteSpace: "pre-wrap" as const,
      fontSize: 13,
      lineHeight: 1.35,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "rgba(255,255,255,0.65)",
      fontSize: 12,
      fontWeight: 700,
      opacity: 0.85,
      whiteSpace: "nowrap" as const,
    },
    dot: { width: 8, height: 8, borderRadius: 999, background: "rgba(34,197,94,0.9)" },
  };

  const [focus, setFocus] = useState<null | "date" | "amount" | "category">(null);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Budget</h1>
            <p style={styles.subtitle}>Quickly record expenses</p>
          </div>

          <div style={styles.badge}>
            <span style={styles.dot} />
            <span>Online</span>
          </div>
        </header>

        <main style={styles.card}>
          <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Date</span>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{
                  ...styles.control,
                  ...(focus === "date" ? styles.controlFocus : {}),
                }}
                onFocus={() => setFocus("date")}
                onBlur={() => setFocus(null)}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Amount</span>
                <span style={styles.hint}>{amountPreview || "AUD"}</span>
              </div>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 12.50"
                required
                style={{
                  ...styles.control,
                  ...(focus === "amount" ? styles.controlFocus : {}),
                }}
                onFocus={() => setFocus("amount")}
                onBlur={() => setFocus(null)}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Category</span>
              </div>

              <div style={styles.selectWrap}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  style={{
                    ...styles.control,
                    paddingRight: 36,
                    ...(focus === "category" ? styles.controlFocus : {}),
                  }}
                  onFocus={() => setFocus("category")}
                  onBlur={() => setFocus(null)}
                >
                  <option value="groceries">Groceries</option>
                  <option value="dining_out">Dining out</option>
                  <option value="other">Other</option>
                </select>
                <span style={styles.selectChevron}>▾</span>
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Receipt image</span>
                <span style={styles.hint}>Optional</span>
              </div>

              {!file ? (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  style={{
                    ...styles.control,
                    height: 52,
                    paddingTop: 12,
                    paddingBottom: 12,
                  }}
                />
              ) : (
                <div style={styles.fileRow}>
                  <div style={styles.fileMeta}>
                    <div style={styles.fileName}>{file.name}</div>
                    <div style={styles.fileSub}>
                      {Math.round(file.size / 1024)} KB - {file.type || "image"}
                    </div>
                  </div>
                  <button type="button" onClick={clearImage} style={styles.fileBtn}>
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...styles.primaryBtn,
                ...(canSubmit ? {} : styles.primaryBtnDisabled),
              }}
            >
              {status === "reading" ? "Preparing…" : "Save"}
            </button>

            {message && <div style={styles.alert}>{message}</div>}
          </form>
        </main>
      </div>
    </div>
  );
}
