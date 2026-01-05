import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function toBool01(v: string | null): boolean | null {
  if (v === null) return null;
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

type UploadInterpretation =
  | { kind: "skipped" }
  | { kind: "ok" }
  | { kind: "failed" }
  | { kind: "unknown"; reason: string };

export default function Result() {
  const q = useQuery();

  // ok=1/0（未指定 or 不正値は unknown 扱い）
  const okVal = toBool01(q.get("ok"));

  // upload_ok=1/0, upload_skipped=1/0
  const uploadOkVal = toBool01(q.get("upload_ok"));
  const uploadSkippedVal = toBool01(q.get("upload_skipped"));

  // --- upload の解釈ルール ---
  // 1) skipped=1 が最優先（=アップロードしない。通知不要）
  // 2) skipped!=1 のときに upload_ok を見る
  // 3) どちらも無い/不正なら unknown
  const upload: UploadInterpretation = (() => {
    if (uploadSkippedVal === true) return { kind: "skipped" };

    if (uploadOkVal === true) return { kind: "ok" };
    if (uploadOkVal === false) return { kind: "failed" };

    // upload_ok が無い / 不正
    return { kind: "unknown", reason: "upload_ok missing or invalid" };
  })();

  // --- 画面メッセージ ---
  // あなたの要件：
  // - 画像スキップ（upload_skipped=1）は書かなくていい
  // - 画像アップロード失敗はユーザに知らせたい
  const view = (() => {
    if (okVal === true) {
      if (upload.kind === "failed") {
        return {
          ok: false, // 画面は注意色にしてもよい
          title: "結果",
          message: "保存は成功しましたが、画像アップロードに失敗しました。",
        };
      }
      // upload ok / skipped / unknown は、基本は成功表示（unknownはデバッグで確認）
      return {
        ok: true,
        title: "結果",
        message: "保存しました ✅",
      };
    }

    if (okVal === false) {
      return {
        ok: false,
        title: "結果",
        message: "保存に失敗しました。",
      };
    }

    // ok が無い/不正
    return {
      ok: false,
      title: "結果",
      message: "結果パラメータが不正です（ok=1/0 が必要）。",
    };
  })();

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "32px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>{view.title}</h1>

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          // background: view.ok ? "#e9ffe5" : "#ffe5e5",
          border: "1px solid rgba(0,0,0,0.1)",
          whiteSpace: "pre-wrap",
        }}
      >
        {view.message}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <Link
          to="/"
          style={{
            display: "inline-block",
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          入力画面に戻る
        </Link>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary>デバッグ（解釈結果）</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify(
  {
    received: {
      ok: q.get("ok"),
      upload_ok: q.get("upload_ok"),
      upload_skipped: q.get("upload_skipped"),
    },
    parsed: {
      ok: okVal,
      upload_ok: uploadOkVal,
      upload_skipped: uploadSkippedVal,
    },
    interpreted: {
      upload,
    },
  },
  null,
  2
)}
        </pre>
      </details>
    </div>
  );
}
