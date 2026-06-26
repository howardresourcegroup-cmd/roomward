"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Trash2, X, Check, MousePointer2, Stamp, Sparkles, FileText,
  Maximize2, Plus, Minus, Ruler,
} from "lucide-react";
import type { Floor, Space } from "@/types";
import { cn, SPACE_STATUS_CONFIG, spaceSqFt, formatSqFt } from "@/lib/utils";
import { createSpace, deleteSpace, updateSpace, updateFloorGrid, bulkCreateSpaces } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParsedRoom } from "@/app/api/ai/fill-floor/route";

// ── Grid constants ────────────────────────────────────────────────────────────
const CELL = 48;
const GAP  = 3;
const S    = CELL + GAP;
const PAD  = 16;
const H    = 10; // handle size

const ROOM_TYPES = [
  "guest_room","suite","cabin","lobby","office","restaurant","kitchen",
  "bar","conference","restroom","housekeeping","maintenance","mechanical",
  "pool","spa","fitness","storage","utility","hallway","elevator","other",
];

const TYPE_LABEL: Record<string,string> = Object.fromEntries(
  ROOM_TYPES.map(t => [t, t.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase())])
);

type RH = "nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w";
const HANDLES: RH[] = ["nw","n","ne","e","se","s","sw","w"];
type EditorMode = "draw" | "stamp";

interface Rect { x:number; y:number; w:number; h:number }
interface DragState {
  type: "none"|"create"|"move"|"resize";
  spaceId?: string; handle?: RH;
  startCell?: {x:number;y:number}; endCell?: {x:number;y:number};
  offsetX?: number; offsetY?: number;
  baseRect?: Rect;
}

// ── Math ──────────────────────────────────────────────────────────────────────
function m2c(px:number,py:number,cols:number,rows:number) {
  return {
    x: Math.max(1,Math.min(cols, Math.floor((px-PAD)/S)+1)),
    y: Math.max(1,Math.min(rows, Math.floor((py-PAD)/S)+1)),
  };
}
function c2r(a:{x:number;y:number},b:{x:number;y:number}): Rect {
  return { x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), w:Math.abs(a.x-b.x)+1, h:Math.abs(a.y-b.y)+1 };
}
function r2px(r:Rect) {
  return { left:PAD+(r.x-1)*S, top:PAD+(r.y-1)*S, width:r.w*CELL+(r.w-1)*GAP, height:r.h*CELL+(r.h-1)*GAP };
}
function s2px(s:Space) { return r2px({x:s.position_x,y:s.position_y,w:s.width,h:s.height}); }

function hPos(h:RH,px:ReturnType<typeof r2px>) {
  const {left:l,top:t,width:w,height:hi}=px;
  const cx=l+w/2-H/2, cy=t+hi/2-H/2, r=l+w-H/2, b=t+hi-H/2;
  const m:Record<RH,{left:number;top:number}> = {
    nw:{left:l-H/2,top:t-H/2}, n:{left:cx,top:t-H/2}, ne:{left:r,top:t-H/2},
    e:{left:r,top:cy}, se:{left:r,top:b}, s:{left:cx,top:b},
    sw:{left:l-H/2,top:b}, w:{left:l-H/2,top:cy},
  };
  return m[h];
}
function hCursor(h:RH) {
  if(h==="nw"||h==="se") return "cursor-nwse-resize";
  if(h==="ne"||h==="sw") return "cursor-nesw-resize";
  if(h==="n" ||h==="s")  return "cursor-ns-resize";
  return "cursor-ew-resize";
}
function applyResize(base:Rect,h:RH,dc:{x:number;y:number},cols:number,rows:number):Rect {
  let {x,y,w,h:hi}={...base};
  if(h.includes("w")){const nx=Math.min(base.x+base.w-1,base.x+dc.x);w=base.w-(nx-base.x);x=nx;}
  if(h.includes("e")){w=Math.max(1,base.w+dc.x);}
  if(h.includes("n")){const ny=Math.min(base.y+base.h-1,base.y+dc.y);hi=base.h-(ny-base.y);y=ny;}
  if(h.includes("s")){hi=Math.max(1,base.h+dc.y);}
  x=Math.max(1,x);y=Math.max(1,y);
  w=Math.max(1,Math.min(w,cols-x+1));hi=Math.max(1,Math.min(hi,rows-y+1));
  return {x,y,w,h:hi};
}
function overlaps(r:Rect,spaces:Space[],excludeId:string|null) {
  return spaces.some(s=>{
    if(s.id===excludeId)return false;
    return r.x<s.position_x+s.width&&r.x+r.w>s.position_x&&
           r.y<s.position_y+s.height&&r.y+r.h>s.position_y;
  });
}

// Auto-place a list of rooms in a grid starting at a given cell
function autoPlace(
  rooms: {name:string;type:string}[],
  existing: Space[],
  cols: number, rows: number,
  roomW=2, roomH=2
): {name:string;type:string;position_x:number;position_y:number;width:number;height:number}[] {
  const placed: {name:string;type:string;position_x:number;position_y:number;width:number;height:number}[] = [];
  const occupied = (x:number,y:number,w:number,h:number,excl:typeof placed) => {
    const allSpaces = [...existing, ...excl.map(p=>({
      id:"",position_x:p.position_x,position_y:p.position_y,width:p.width,height:p.height,
      floor_id:"",name:"",type:"",status:"operational" as const,
      housekeeping_status:null,occupancy:null,created_at:"",updated_at:"",qr_code:null,notes:null,
    } as unknown as Space))];
    return overlaps({x,y,w,h},allSpaces,null);
  };
  for (const room of rooms) {
    let placed_it = false;
    for (let y=1; y<=rows-roomH+1 && !placed_it; y++) {
      for (let x=1; x<=cols-roomW+1 && !placed_it; x++) {
        if (!occupied(x,y,roomW,roomH,placed)) {
          placed.push({...room,position_x:x,position_y:y,width:roomW,height:roomH});
          placed_it = true;
        }
      }
    }
    // If 2×2 didn't fit, try 1×1
    if (!placed_it) {
      for (let y=1; y<=rows && !placed_it; y++) {
        for (let x=1; x<=cols && !placed_it; x++) {
          if (!occupied(x,y,1,1,placed)) {
            placed.push({...room,position_x:x,position_y:y,width:1,height:1});
            placed_it = true;
          }
        }
      }
    }
  }
  return placed;
}

// Parse CSV/plain text to room list
function parseRoomText(text:string): {name:string;type:string}[] {
  return text.split("\n")
    .map(line=>line.trim()).filter(Boolean)
    .map(line=>{
      const [namePart, typePart] = line.split(",").map(s=>s.trim());
      const type = ROOM_TYPES.includes(typePart?.toLowerCase().replace(/ /g,"_") ?? "")
        ? typePart!.toLowerCase().replace(/ /g,"_") : "guest_room";
      return { name: namePart.slice(0,30), type };
    })
    .filter(r=>r.name);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  floor: Floor;
  spaces: Space[];
  onAdd:        (s:Space) => void;
  onAddMany:    (s:Space[]) => void;
  onRemove:     (id:string) => void;
  onPatch:      (id:string, patch:Partial<Space>) => void;
  onPatchFloor: (patch:Partial<Floor>) => void;
  onDone:       () => void;
}

export function FloorBuilder({ floor, spaces, onAdd, onAddMany, onRemove, onPatch, onPatchFloor, onDone }:Props) {
  const cols = floor.grid_cols ?? 16;
  const rows = floor.grid_rows ?? 10;

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [editorMode, setEditorMode] = useState<EditorMode>("draw");

  // Stamp mode config
  const [stampType, setStampType]       = useState("guest_room");
  const [stampPrefix, setStampPrefix]   = useState("Room");
  const [stampCounter, setStampCounter] = useState(101);
  const [stampSaving, setStampSaving]   = useState(false);

  // Import panel
  const [importPanel, setImportPanel]   = useState<null|"ai"|"csv">(null);
  const [aiDesc, setAiDesc]             = useState("");
  const [csvText, setCsvText]           = useState("");
  const [preview, setPreview]           = useState<{name:string;type:string}[]|null>(null);
  const [importing, setImporting]       = useState(false);
  const [importError, setImportError]   = useState("");

  // Draw + move/resize state
  const containerRef = useRef<HTMLDivElement>(null);
  const drag         = useRef<DragState>({type:"none"});
  const [liveRect, setLiveRect]     = useState<Rect|null>(null);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [pending, setPending]       = useState<Rect|null>(null);
  const [newName, setNewName]       = useState("");
  const [newType, setNewType]       = useState("guest_room");
  const [editName, setEditName]     = useState("");
  const [editType, setEditType]     = useState("guest_room");
  const [saving, setSaving]         = useState(false);
  const [clash, setClash]           = useState(false);

  // Grid size
  const [colsInput, setColsInput] = useState(String(cols));
  const [rowsInput, setRowsInput] = useState(String(rows));
  useEffect(()=>{setColsInput(String(cols));setRowsInput(String(rows));},[cols,rows]);

  // Real-world scale (feet per grid cell) — drives computed sq ft + the scale bar
  const scale = floor.scale_ft_per_cell ?? null;
  const [scaleInput, setScaleInput] = useState(scale ? String(scale) : "");
  useEffect(()=>{setScaleInput(scale ? String(scale) : "");},[scale]);
  const [editSqFt, setEditSqFt] = useState("");

  useEffect(()=>{
    const s=spaces.find(s=>s.id===selectedId);
    if(s){setEditName(s.name);setEditType(s.type);setEditSqFt(s.sq_ft != null ? String(s.sq_ft) : "");}
  },[selectedId,spaces]);

  const evCell = useCallback((e:React.MouseEvent)=>{
    const r=containerRef.current!.getBoundingClientRect();
    return m2c(e.clientX-r.left,e.clientY-r.top,cols,rows);
  },[cols,rows]);

  // ── Stamp click ───────────────────────────────────────────────────────────
  const doStamp = useCallback(async (e:React.MouseEvent)=>{
    if(e.button!==0||stampSaving)return;
    e.preventDefault(); e.stopPropagation();
    const cell=evCell(e);
    const rw=cell.x+1<=cols?2:1, rh=cell.y+1<=rows?2:1;
    const r:Rect={x:cell.x,y:cell.y,w:rw,h:rh};
    if(overlaps(r,spaces,null))return;
    const name=`${stampPrefix.trim()||"Room"} ${stampCounter}`;
    setStampSaving(true);
    try{
      const space=await createSpace({floor_id:floor.id,name,type:stampType,position_x:r.x,position_y:r.y,width:r.w,height:r.h});
      onAdd(space);
      setStampCounter(c=>c+1);
    }catch{toast.error("Couldn't add the room. Please try again.");}
    setStampSaving(false);
  },[evCell,cols,rows,spaces,stampType,stampPrefix,stampCounter,stampSaving,floor.id,onAdd]);

  // ── Draw / move / resize ──────────────────────────────────────────────────
  const onGridDown = useCallback((e:React.MouseEvent)=>{
    if(e.button!==0)return;
    if(editorMode==="stamp"){doStamp(e);return;}
    e.preventDefault();
    const cell=evCell(e);
    if(!(e.target as HTMLElement).closest("[data-space]")){
      setSelectedId(null);setPending(null);
      drag.current={type:"create",startCell:cell,endCell:cell};
      setLiveRect({x:cell.x,y:cell.y,w:1,h:1});
    }
  },[editorMode,doStamp,evCell]);

  const onSpaceDown=useCallback((e:React.MouseEvent,s:Space)=>{
    if(e.button!==0||editorMode==="stamp")return;
    e.stopPropagation();e.preventDefault();
    const cell=evCell(e);
    setSelectedId(s.id);setPending(null);
    drag.current={type:"move",spaceId:s.id,offsetX:cell.x-s.position_x,offsetY:cell.y-s.position_y,endCell:cell};
    setLiveRect({x:s.position_x,y:s.position_y,w:s.width,h:s.height});
  },[editorMode,evCell]);

  const onHandleDown=useCallback((e:React.MouseEvent,s:Space,h:RH)=>{
    if(e.button!==0)return;
    e.stopPropagation();e.preventDefault();
    const cell=evCell(e);
    drag.current={type:"resize",spaceId:s.id,handle:h,startCell:cell,baseRect:{x:s.position_x,y:s.position_y,w:s.width,h:s.height}};
    setLiveRect({x:s.position_x,y:s.position_y,w:s.width,h:s.height});
  },[evCell]);

  const onMouseMove=useCallback((e:React.MouseEvent)=>{
    const d=drag.current;if(d.type==="none")return;
    const cell=evCell(e);
    if(d.type==="create"){drag.current={...d,endCell:cell};setLiveRect(c2r(d.startCell!,cell));}
    if(d.type==="move"){
      const s=spaces.find(s=>s.id===d.spaceId);if(!s)return;
      const nx=Math.max(1,Math.min(cols-s.width+1,cell.x-(d.offsetX??0)));
      const ny=Math.max(1,Math.min(rows-s.height+1,cell.y-(d.offsetY??0)));
      const r:Rect={x:nx,y:ny,w:s.width,h:s.height};
      drag.current={...d,endCell:cell};setClash(overlaps(r,spaces,d.spaceId!));setLiveRect(r);
    }
    if(d.type==="resize"){
      const dc={x:cell.x-d.startCell!.x,y:cell.y-d.startCell!.y};
      const r=applyResize(d.baseRect!,d.handle!,dc,cols,rows);
      setClash(overlaps(r,spaces,d.spaceId!));setLiveRect(r);
    }
  },[evCell,spaces,cols,rows]);

  const onMouseUp=useCallback(async()=>{
    const d=drag.current;drag.current={type:"none"};
    if(d.type==="create"&&d.startCell&&d.endCell){
      const r=c2r(d.startCell,d.endCell);
      if(!overlaps(r,spaces,null)){setPending(r);setNewName("");setNewType("guest_room");}
      setLiveRect(null);return;
    }
    if((d.type==="move"||d.type==="resize")&&liveRect&&!clash){
      const patch={position_x:liveRect.x,position_y:liveRect.y,width:liveRect.w,height:liveRect.h};
      onPatch(d.spaceId!,patch);
      await updateSpace(d.spaceId!,patch).catch(()=>{});
    }
    setLiveRect(null);setClash(false);
  },[liveRect,clash,spaces,onPatch]);

  const saveNew=async()=>{
    if(!pending||!newName.trim())return;setSaving(true);
    try{const s=await createSpace({floor_id:floor.id,name:newName.trim(),type:newType,position_x:pending.x,position_y:pending.y,width:pending.w,height:pending.h});onAdd(s);setPending(null);setNewName("");}catch{toast.error("Couldn't create the room. Please try again.");}
    setSaving(false);
  };
  const saveEdit=async()=>{
    if(!selectedId||!editName.trim())return;
    const sqft=editSqFt.trim()===""?null:Math.max(0,parseFloat(editSqFt)||0)||null;
    const patch={name:editName.trim(),type:editType,sq_ft:sqft};onPatch(selectedId,patch);
    await updateSpace(selectedId,patch).catch(()=>{});
  };
  const applyScale=async()=>{
    const v=scaleInput.trim()===""?null:Math.max(0.5,Math.min(100,parseFloat(scaleInput)||0))||null;
    if(v===scale)return;
    onPatchFloor({scale_ft_per_cell:v});
    await updateFloorGrid(floor.id,{scale_ft_per_cell:v}).catch(()=>{});
  };
  const deleteSelected=async()=>{
    if(!selectedId)return;onRemove(selectedId);setSelectedId(null);
    await deleteSpace(selectedId).catch(()=>toast.error("Couldn't delete the room. Please try again."));
  };
  const applyGridSize=async()=>{
    const nc=Math.max(4,Math.min(40,parseInt(colsInput)||cols));
    const nr=Math.max(4,Math.min(40,parseInt(rowsInput)||rows));
    if(nc===cols&&nr===rows)return;
    onPatchFloor({grid_cols:nc,grid_rows:nr});
    await updateFloorGrid(floor.id,{grid_cols:nc,grid_rows:nr}).catch(()=>{});
  };

  // ── AI fill ───────────────────────────────────────────────────────────────
  const runAI=async()=>{
    if(!aiDesc.trim())return;setImporting(true);setImportError("");
    try{
      const res=await fetch("/api/ai/fill-floor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:aiDesc})});
      if(!res.ok)throw new Error((await res.json()).error??"Parse failed");
      const {rooms}:{rooms:ParsedRoom[]}=await res.json();
      setPreview(rooms);
    }catch(e){setImportError(e instanceof Error?e.message:"Failed");}
    setImporting(false);
  };

  // ── CSV parse ─────────────────────────────────────────────────────────────
  const runCSV=()=>setPreview(parseRoomText(csvText));

  // ── Apply preview ─────────────────────────────────────────────────────────
  const applyImport=async()=>{
    if(!preview?.length)return;setImporting(true);
    try{
      const placed=autoPlace(preview,spaces,cols,rows);
      if(!placed.length){setImportError("No space left on this floor — increase grid size first.");setImporting(false);return;}
      const withFloor=placed.map(p=>({...p,floor_id:floor.id}));
      const created=await bulkCreateSpaces(withFloor);
      onAddMany(created);
      setImportPanel(null);setPreview(null);setAiDesc("");setCsvText("");
    }catch(e){setImportError(e instanceof Error?e.message:"Failed to create rooms");}
    setImporting(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedSpace=spaces.find(s=>s.id===selectedId)??null;
  const draggingId=drag.current.type==="move"||drag.current.type==="resize"?drag.current.spaceId:null;
  const gridW=cols*CELL+(cols-1)*GAP+PAD*2;
  const gridH=rows*CELL+(rows-1)*GAP+PAD*2;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Mode toggles */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <button onClick={()=>{setEditorMode("draw");setImportPanel(null);}}
              className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors",
                editorMode==="draw"?"bg-foreground/[0.08] text-foreground":"text-muted-foreground hover:text-foreground")}>
              <MousePointer2 className="h-3.5 w-3.5"/>Draw
            </button>
            <button onClick={()=>{setEditorMode("stamp");setImportPanel(null);setPending(null);}}
              className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors",
                editorMode==="stamp"?"bg-indigo-500/20 text-indigo-200":"text-muted-foreground hover:text-foreground")}>
              <Stamp className="h-3.5 w-3.5"/>Stamp
            </button>
          </div>

          {/* Import buttons */}
          <button onClick={()=>{setImportPanel(importPanel==="ai"?null:"ai");setEditorMode("draw");setPreview(null);}}
            className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
              importPanel==="ai"?"bg-indigo-500/15 border-indigo-500/40 text-indigo-200":"border-border text-muted-foreground hover:border-white/20")}>
            <Sparkles className="h-3.5 w-3.5"/>AI Fill
          </button>
          <button onClick={()=>{setImportPanel(importPanel==="csv"?null:"csv");setEditorMode("draw");setPreview(null);}}
            className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
              importPanel==="csv"?"bg-emerald-500/15 border-emerald-500/40 text-emerald-200":"border-border text-muted-foreground hover:border-white/20")}>
            <FileText className="h-3.5 w-3.5"/>CSV
          </button>
        </div>

        {/* Scale + grid size + done */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Feet per grid cell — sets the real-world scale of this floor plan">
            <Ruler className="h-3.5 w-3.5"/>
            <input type="number" min={0.5} max={100} step={0.5} value={scaleInput} placeholder="ft"
              onChange={e=>setScaleInput(e.target.value)} onBlur={applyScale}
              onKeyDown={e=>e.key==="Enter"&&applyScale()}
              className="w-14 h-7 rounded-md bg-foreground/[0.04] border border-border text-foreground text-center text-xs px-1"/>
            <span>ft/cell</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Maximize2 className="h-3.5 w-3.5"/>
            <input type="number" min={4} max={40} value={colsInput}
              onChange={e=>setColsInput(e.target.value)} onBlur={applyGridSize}
              onKeyDown={e=>e.key==="Enter"&&applyGridSize()}
              className="w-12 h-7 rounded-md bg-foreground/[0.04] border border-border text-foreground text-center text-xs px-1"/>
            <span>×</span>
            <input type="number" min={4} max={40} value={rowsInput}
              onChange={e=>setRowsInput(e.target.value)} onBlur={applyGridSize}
              onKeyDown={e=>e.key==="Enter"&&applyGridSize()}
              className="w-12 h-7 rounded-md bg-foreground/[0.04] border border-border text-foreground text-center text-xs px-1"/>
          </div>
          <Button size="sm" onClick={onDone}><Check className="h-3.5 w-3.5"/>Done</Button>
        </div>
      </div>

      {/* ── Stamp config bar ── */}
      <AnimatePresence>
        {editorMode==="stamp"&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 px-4 py-3">
              <Stamp className="h-4 w-4 text-indigo-400 shrink-0"/>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Type</span>
                <Select value={stampType} onValueChange={setStampType}>
                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>{ROOM_TYPES.map(t=><SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prefix</span>
                <Input value={stampPrefix} onChange={e=>setStampPrefix(e.target.value)} className="h-7 w-24 text-xs"/>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">#</span>
                <div className="flex items-center">
                  <button onClick={()=>setStampCounter(c=>Math.max(1,c-1))}
                    className="h-7 w-7 flex items-center justify-center rounded-l-md bg-foreground/[0.04] border border-border text-muted-foreground hover:text-foreground">
                    <Minus className="h-3 w-3"/>
                  </button>
                  <input type="number" value={stampCounter} onChange={e=>setStampCounter(+e.target.value||1)}
                    className="h-7 w-16 bg-foreground/[0.04] border-y border-border text-foreground text-center text-xs px-1"/>
                  <button onClick={()=>setStampCounter(c=>c+1)}
                    className="h-7 w-7 flex items-center justify-center rounded-r-md bg-foreground/[0.04] border border-border text-muted-foreground hover:text-foreground">
                    <Plus className="h-3 w-3"/>
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">Click any empty cell to stamp → <span className="text-muted-foreground">{stampPrefix} {stampCounter}</span></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import panel ── */}
      <AnimatePresence>
        {importPanel&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden">
            <div className={cn("rounded-xl border p-4 space-y-3",
              importPanel==="ai"?"bg-indigo-500/[0.04] border-indigo-500/20":"bg-emerald-500/[0.04] border-emerald-500/20")}>
              {importPanel==="ai"?(
                <>
                  <p className="text-xs font-medium text-indigo-300 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5"/>Describe the rooms on this floor</p>
                  <Textarea value={aiDesc} onChange={e=>setAiDesc(e.target.value)} placeholder={`e.g. "18 guest rooms numbered 301-318, 2 suites (301S and 302S), 1 housekeeping storage, 1 maintenance closet"`}
                    className="min-h-[72px] text-sm resize-none"
                    onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))runAI();}}/>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={runAI} disabled={importing||!aiDesc.trim()} className="flex-1">
                      {importing?"Parsing…":<><Sparkles className="h-3.5 w-3.5"/>Generate room list</>}
                    </Button>
                    <button onClick={()=>{setImportPanel(null);setPreview(null);}} className="text-xs text-muted-foreground hover:text-foreground px-2">Cancel</button>
                  </div>
                </>
              ):(
                <>
                  <p className="text-xs font-medium text-emerald-300 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5"/>Paste room list — one per line</p>
                  <Textarea value={csvText} onChange={e=>setCsvText(e.target.value)}
                    placeholder={"Room 101\nRoom 102, suite\nMaintenance Closet, maintenance\nHousekeeping Storage, housekeeping"}
                    className="min-h-[100px] text-xs resize-none font-mono"/>
                  <p className="text-[11px] text-muted-foreground">Format: <span className="text-muted-foreground">Name</span> or <span className="text-muted-foreground">Name, type</span> — type is optional, defaults to guest_room</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={runCSV} disabled={!csvText.trim()} className="flex-1">Preview rooms</Button>
                    <button onClick={()=>{setImportPanel(null);setPreview(null);}} className="text-xs text-muted-foreground hover:text-foreground px-2">Cancel</button>
                  </div>
                </>
              )}

              {/* Preview */}
              <AnimatePresence>
                {preview&&(
                  <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{preview.length} rooms to place</p>
                      <button onClick={()=>setPreview(null)} className="text-[11px] text-muted-foreground hover:text-muted-foreground">Clear</button>
                    </div>
                    <div className="max-h-32 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {preview.map((r,i)=>(
                        <div key={i} className="flex items-center gap-1.5 text-[11px] bg-foreground/[0.03] border border-border rounded px-2 py-1">
                          <span className="text-foreground truncate">{r.name}</span>
                          <span className="text-muted-foreground shrink-0">{r.type.replace(/_/g," ")}</span>
                        </div>
                      ))}
                    </div>
                    {importError&&<p className="text-xs text-red-400">{importError}</p>}
                    <Button size="sm" className="w-full" onClick={applyImport} disabled={importing}>
                      {importing?"Placing rooms…":`Place all ${preview.length} rooms on floor`}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 items-start">
        {/* ── Canvas ── */}
        <div className="flex-1 overflow-auto">
          <div ref={containerRef}
            className={cn("relative rounded-xl border border-border bg-background select-none",
              editorMode==="stamp"?"cursor-crosshair":"")}
            style={{width:gridW,height:gridH,minWidth:gridW}}
            onMouseDown={onGridDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
            onMouseLeave={()=>{if(drag.current.type!=="none")onMouseUp();}}>

            {/* Grid cells */}
            {Array.from({length:rows}).map((_,y)=>
              Array.from({length:cols}).map((_,x)=>(
                <div key={`${x}-${y}`} className="absolute pointer-events-none"
                  style={{left:PAD+x*S,top:PAD+y*S,width:CELL,height:CELL,
                    background:"rgba(255,255,255,0.012)",border:"1px solid rgba(255,255,255,0.025)"}}/>
              ))
            )}

            {/* Rooms */}
            {spaces.map(s=>{
              const px=s2px(s);
              const cfg=SPACE_STATUS_CONFIG[s.status]??SPACE_STATUS_CONFIG["operational"];
              const isSel=s.id===selectedId;
              const isDrag=s.id===draggingId;
              return(
                <div key={s.id} data-space={s.id}
                  onMouseDown={e=>onSpaceDown(e,s)}
                  className={cn("absolute rounded-md border flex flex-col items-center justify-center p-1 transition-opacity",
                    cfg.bg,cfg.border,
                    isSel&&"ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#0a0a16]",
                    isDrag?"opacity-30 cursor-grabbing":editorMode==="stamp"?"cursor-crosshair":"cursor-grab hover:brightness-110")}
                  style={{...px,zIndex:isSel?20:10}}>
                  <span className={cn("text-[9px] font-semibold leading-tight text-center line-clamp-2 select-none",cfg.color)}>{s.name}</span>
                  {isSel&&!isDrag&&HANDLES.map(h=>(
                    <div key={h} onMouseDown={e=>onHandleDown(e,s,h)}
                      className={cn("absolute rounded-sm bg-indigo-400 border-2 border-[#0a0a16] z-30",hCursor(h))}
                      style={{width:H,height:H,...hPos(h,px)}}/>
                  ))}
                </div>
              );
            })}

            {/* Create preview */}
            {drag.current.type==="create"&&liveRect&&(
              <div className="absolute rounded-md border-2 border-dashed border-indigo-400 bg-indigo-500/20 pointer-events-none flex items-center justify-center"
                style={r2px(liveRect)}>
                <span className="text-[10px] text-indigo-300 font-medium">
                  {scale ? `${Math.round(liveRect.w*scale)}×${Math.round(liveRect.h*scale)} ft` : `${liveRect.w}×${liveRect.h}`}
                </span>
              </div>
            )}

            {/* Move/resize preview */}
            {(drag.current.type==="move"||drag.current.type==="resize")&&liveRect&&(
              <div className={cn("absolute rounded-md border-2 pointer-events-none flex items-center justify-center",
                clash?"border-red-400 bg-red-500/20":"border-indigo-400 bg-indigo-500/20")}
                style={{...r2px(liveRect),zIndex:50}}>
                {clash&&<span className="text-[10px] text-red-300">Overlaps</span>}
              </div>
            )}
          </div>

          {/* Scale bar + floor total (architectural-drawing style) */}
          <div className="flex items-center justify-between mt-2 px-1">
            {scale ? (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground select-none">
                {/* exactly 2 grid cells wide (2·CELL + GAP px), so the bar is honest */}
                <div className="h-1.5 border-x border-b border-muted-foreground/60 flex" style={{ width: CELL * 2 + GAP }}>
                  <div className="w-1/2 h-full bg-muted-foreground/40" />
                </div>
                <span>{Math.round(scale * 2)} ft</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground select-none">Set ft/cell above to make this plan to-scale</span>
            )}
            {scale && (
              <span className="text-[10px] text-muted-foreground select-none">
                Floor total ≈ {formatSqFt(spaces.reduce((sum, s) => sum + (spaceSqFt(s, scale) ?? 0), 0))}
              </span>
            )}
          </div>
        </div>

        {/* ── Side panel ── */}
        <AnimatePresence>
          {(pending||selectedSpace)&&(
            <motion.div initial={{x:20,opacity:0}} animate={{x:0,opacity:1}} exit={{x:20,opacity:0}}
              className="w-60 shrink-0 glass-card p-4 space-y-3">
              {pending?(
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">New Room</p>
                    <button onClick={()=>setPending(null)} className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-muted-foreground"><X className="h-3.5 w-3.5"/></button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {pending.w}×{pending.h} cells at ({pending.x},{pending.y})
                    {scale ? <> · {Math.round(pending.w*scale)}×{Math.round(pending.h*scale)} ft ≈ <span className="text-foreground">{formatSqFt(Math.round(pending.w*scale*pending.h*scale))}</span></> : null}
                  </p>
                  <div className="space-y-1"><Label className="text-xs">Name</Label>
                    <Input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Room 215" onKeyDown={e=>e.key==="Enter"&&saveNew()}/>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{ROOM_TYPES.map(t=><SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="w-full" onClick={saveNew} disabled={saving||!newName.trim()}>{saving?"Adding…":"Add Room"}</Button>
                </>
              ):selectedSpace?(
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Edit Room</p>
                    <button onClick={()=>setSelectedId(null)} className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-muted-foreground"><X className="h-3.5 w-3.5"/></button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedSpace.width}×{selectedSpace.height} cells · ({selectedSpace.position_x},{selectedSpace.position_y})
                    {scale ? <> · {Math.round(selectedSpace.width*scale)}×{Math.round(selectedSpace.height*scale)} ft</> : null}
                  </p>
                  <div className="space-y-1"><Label className="text-xs">Name</Label>
                    <Input value={editName} onChange={e=>setEditName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveEdit()}/>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Type</Label>
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{ROOM_TYPES.map(t=><SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Square footage</Label>
                    <Input type="number" min={0} step={1} value={editSqFt}
                      onChange={e=>setEditSqFt(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&saveEdit()}
                      placeholder={scale ? `auto: ${spaceSqFt({...selectedSpace, sq_ft: null}, scale) ?? ""}` : "e.g. 320"}/>
                    <p className="text-[10px] text-muted-foreground">
                      {scale ? "Leave blank to compute from the floor scale." : "Or set ft/cell in the toolbar to auto-compute."}
                    </p>
                  </div>
                  <Button size="sm" className="w-full" onClick={saveEdit} disabled={!editName.trim()}>Save Changes</Button>
                  <button onClick={deleteSelected}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1.5 rounded-lg hover:bg-red-500/[0.08] transition-colors">
                    <Trash2 className="h-3.5 w-3.5"/>Delete Room
                  </button>
                </>
              ):null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
