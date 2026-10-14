import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export type ImgItem = { url?: string; file?: File };

function Thumb({ item }: { item: ImgItem }) {
  const src = useMemo(() => (item.file ? URL.createObjectURL(item.file) : item.url ?? ""), [item]);
  useEffect(() => () => { if (item.file) URL.revokeObjectURL(src); }, [src, item.file]);
  return <img src={src} alt="" className="size-full object-cover" />;
}

export function ImageDrop({ label, hint, items, onChange, max = 1 }: {
  label: string; hint?: string; items: ImgItem[]; onChange: (v: ImgItem[]) => void; max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const add = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/")).map((file) => ({ file }));
    onChange(max === 1 ? imgs.slice(0, 1) : [...items, ...imgs].slice(0, max));
  };
  const full = items.length >= max && max > 1;
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      {!full && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${over ? "border-primary bg-primary/10" : "border-primary/50 bg-primary/5 hover:bg-primary/10"}`}
        >
          <ImagePlus className="size-8 text-primary" />
          <span className="text-sm font-semibold text-primary">{max === 1 ? (items.length ? "Change image" : "Click to upload") : "Click or drag photos here"}</span>
          <span className="text-xs text-muted-foreground">{hint ?? `JPG or PNG, under 5MB${max > 1 ? ` · up to ${max} photos` : ""}`}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((it, i) => (
            <div key={i} className="relative size-20 overflow-hidden rounded-lg border border-border">
              <Thumb item={it} />
              {max > 1 && i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-background/80 text-center text-[10px]">Cover</span>}
              <button type="button" aria-label="Remove image" onClick={() => onChange(items.filter((_, k) => k !== i))} className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
