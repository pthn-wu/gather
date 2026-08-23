import { useState } from "react";
import { api } from "../../api/client";
import { useStore } from "../../context/store";
import { useToast } from "../../context/ToastContext";
import { C, F } from "../../theme";
import { DarkBtn, Eyebrow, GhostBtn, PageHead, Panel } from "../../components/ui";

/**
 * Lands in the resident Updates feed. A draft is saved but never served to
 * residents — the API filters drafts out of /api/alerts, so saving one here is
 * genuinely private to the office.
 */
export default function Announcements() {
  const s = useStore();
  const flash = useToast();
  const comm = s.communityById(s.scope);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const post = async (isDraft: boolean) => {
    if (!title.trim() || !body.trim()) {
      flash("An announcement needs a headline and a body");
      return;
    }
    const created = await s.push(() =>
      api.office.createAnnouncement({ title: title.trim(), body: body.trim(), isDraft })
    );
    s.setAnnouncements((rows) => [
      created ?? {
        id: `local-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        when: "just now",
        reach: isDraft ? "Draft — not sent" : `${comm.households} households · 0 opened`,
        isDraft,
      },
      ...rows,
    ]);
    setTitle("");
    setBody("");
    flash(isDraft ? "Saved as a draft — residents cannot see it" : `Published to ${comm.households} households`);
  };

  const publishDraft = async (id: string) => {
    s.setAnnouncements((rows) =>
      rows.map((a) => (a.id === id ? { ...a, isDraft: false, reach: `${comm.households} households · 0 opened` } : a))
    );
    await s.push(() => api.office.updateAnnouncement(id, { isDraft: false }));
    flash(`Published to ${comm.households} households`);
  };

  return (
    <div>
      <PageHead
        title="Announcements"
        sub={`Lands in Updates for every verified household at ${comm.short ?? comm.name}.`}
      />

      <div
        style={{
          display: "grid", gridTemplateColumns: "minmax(480px,1fr) minmax(420px,1fr)",
          gap: 24, alignItems: "start", marginTop: 22,
        }}
      >
        <Panel>
          <Eyebrow>Write one</Eyebrow>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Headline"
            style={{
              width: "100%", marginTop: 14, padding: "12px 13px", borderRadius: 9,
              border: `1px solid ${C.input}`, fontFamily: F.body, fontSize: 14,
              fontWeight: 700, color: C.ink,
            }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Keep it to two sentences — collection time, what changed, what to bring."
            style={{
              width: "100%", marginTop: 11, padding: "12px 13px", borderRadius: 9,
              border: `1px solid ${C.input}`, fontFamily: F.body, fontSize: 13,
              color: C.ink, lineHeight: 1.55, resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
            <DarkBtn onClick={() => post(false)}>Publish to residents</DarkBtn>
            <GhostBtn onClick={() => post(true)}>Save as draft</GhostBtn>
          </div>
        </Panel>

        <div>
          <div
            style={{
              fontSize: 11, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase",
              paddingBottom: 11, borderBottom: `1.5px solid ${C.ink}`,
            }}
          >
            Sent
          </div>
          {s.announcements.map((a) => (
            <div
              key={a.id}
              style={{
                padding: "16px 12px", borderBottom: `1px solid ${C.line}`,
                background: a.isDraft ? C.rowHover : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, flex: 1 }}>{a.title}</div>
                {a.isDraft && (
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: C.purple }}>
                    DRAFT
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.faint2 }}>{a.when}</div>
              </div>
              <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.55, marginTop: 5 }}>{a.body}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <div style={{ fontSize: 11, color: C.faint }}>{a.reach}</div>
                {a.isDraft && (
                  <button
                    type="button"
                    onClick={() => publishDraft(a.id)}
                    style={{
                      border: 0, background: "transparent", padding: 0, cursor: "pointer",
                      fontFamily: F.body, fontSize: 11.5, fontWeight: 700, color: C.purple,
                    }}
                  >
                    Publish now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
