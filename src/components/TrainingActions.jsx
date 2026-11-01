import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useApp, api } from "../context/AppContext";
import { Modal, Field } from "./UI";
export default function TrainingActions({ collection, record }) {
  const { user, run } = useApp(),
    [mode, setMode] = useState(null),
    [busy, setBusy] = useState(false);
  if (user.role === "student") return null;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await run(
        () =>
          api.updateTraining(
            collection,
            record.id,
            Object.fromEntries(new FormData(e.target)),
          ),
        "Training record updated.",
      );
      setMode(null);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="row-actions">
        <button
          aria-label="Edit training record"
          onClick={() => setMode("edit")}
        >
          <Pencil size={15} />
        </button>
        <button
          aria-label="Delete training record"
          onClick={() => setMode("delete")}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {mode && (
        <Modal
          title={
            mode === "edit" ? "Edit training record" : "Delete training record?"
          }
          onClose={() => setMode(null)}
        >
          {mode === "edit" ? (
            <form className="form" onSubmit={submit}>
              <Field
                label="Date"
                name="date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={record.date}
                required
              />
              {collection === "attendance" ? (
                <>
                  <Field
                    label="Time"
                    name="time"
                    type="time"
                    defaultValue={record.time}
                    required
                  />
                  <Field
                    label="Drill"
                    name="drill"
                    defaultValue={record.drill}
                    required
                  />
                  <Field label="Status">
                    <select name="status" defaultValue={record.status}>
                      <option>Present</option>
                      <option>Absent</option>
                    </select>
                  </Field>
                  <Field
                    label="Remarks"
                    name="remarks"
                    defaultValue={record.remarks}
                  />
                </>
              ) : (
                <>
                  {["fitness", "technique", "composure", "overall"].map((k) => (
                    <Field
                      key={k}
                      label={k + " / 100"}
                      name={k}
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={record[k]}
                      required
                    />
                  ))}
                  <Field label="Coach notes">
                    <textarea
                      name="notes"
                      defaultValue={record.notes}
                      maxLength="1000"
                    />
                  </Field>
                </>
              )}
              <button className="button" disabled={busy}>
                {busy ? "Saving…" : "Save record"}
              </button>
            </form>
          ) : (
            <>
              <p>
                This removes the saved training record from the local academy
                data.
              </p>
              <div className="actions">
                <button
                  className="button secondary"
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await run(
                        () => api.updateTraining(collection, record.id, null),
                        "Training record deleted.",
                      );
                      setMode(null);
                    } catch {
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete record
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
