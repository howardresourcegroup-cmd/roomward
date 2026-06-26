"use client";
export const runtime = "edge";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Building2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PromptDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import { FloorGrid } from "@/components/floorplan/floor-grid";
import { BuildingStack } from "@/components/floorplan/building-stack";
const FloorBuilder = dynamic(() => import("@/components/floorplan/floor-builder").then(m => ({ default: m.FloorBuilder })), { ssr: false });
import { EmptyState } from "@/components/shared/empty-state";
import { PageLoader } from "@/components/shared/loading-spinner";
import { useBuildingDetail, usePermissions } from "@/lib/data/hooks";
import { createFloor } from "@/lib/data/queries";
import { Layers } from "lucide-react";

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { building, floors, spaces, loading, setSpaceStatus, addSpace, removeSpace, addFloor, patchSpace, patchFloor } = useBuildingDetail(id);
  const addManySpaces = useCallback((newSpaces: import("@/types").Space[]) => newSpaces.forEach(addSpace), [addSpace]);
  const { can } = usePermissions();
  const [activeFloorId, setActiveFloorId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [addingFloor, setAddingFloor] = useState(false);
  const [floorPromptOpen, setFloorPromptOpen] = useState(false);
  const [focusSpace, setFocusSpace] = useState<{ id: string; n: number } | undefined>();

  // Clicking a room in the building overview jumps to its floor and opens it.
  const handleSelectSpace = (space: import("@/types").Space) => {
    setActiveFloorId(space.floor_id);
    setFocusSpace({ id: space.id, n: Date.now() });
  };

  const handleAddFloor = async (name: string) => {
    setAddingFloor(true);
    try {
      const floor = await createFloor({ building_id: id, name: name.trim(), level: floors.length + 1 });
      addFloor(floor);
      setActiveFloorId(floor.id);
      setFloorPromptOpen(false);
    } catch { toast.error("Couldn't add the floor. Please try again."); }
    setAddingFloor(false);
  };

  // Default to the first floor once loaded
  useEffect(() => {
    if (!activeFloorId && floors.length) setActiveFloorId(floors[0].id);
  }, [floors, activeFloorId]);

  if (loading) return <PageLoader />;
  if (!building) return <EmptyState icon={Building2} title="Building not found" description="This building may have been removed." />;

  const buildingSpaces = spaces;
  const totalIssues    = buildingSpaces.filter((s) => s.status !== "operational").length;

  const handleStatusChange = setSpaceStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/buildings" className="hover:text-foreground transition-colors">Buildings</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{building.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/20">
            <Building2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{building.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {building.address && `${building.address}, `}{building.city}, {building.state}
              {" · "}{floors.length} floor{floors.length !== 1 ? "s" : ""}
              {" · "}{buildingSpaces.length} spaces
              {totalIssues > 0 && <span className="text-amber-400"> · {totalIssues} issues</span>}
            </p>
          </div>
        </div>
        {can("buildings.edit") && (
          <Button size="sm" variant="secondary" onClick={() => setFloorPromptOpen(true)} disabled={addingFloor}>
            <Plus className="h-4 w-4" />
            {addingFloor ? "Adding…" : "Add Floor"}
          </Button>
        )}
      </div>

      {floors.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No floors configured"
          description="Add floors to start mapping spaces."
          action={can("buildings.edit") ? { label: "Add Floor", onClick: () => setFloorPromptOpen(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Control-panel: building stack overview */}
          <BuildingStack
            floors={floors}
            spaces={spaces.filter((s) => floors.some((f) => f.id === s.floor_id))}
            activeFloorId={activeFloorId}
            onSelectFloor={setActiveFloorId}
            onSelectSpace={handleSelectSpace}
          />

          {/* Detailed floor plan */}
          <Tabs value={activeFloorId} onValueChange={setActiveFloorId} className="min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <TabsList>
                {floors.map((f) => {
                  const fSpaces  = spaces.filter((s) => s.floor_id === f.id);
                  const fIssues  = fSpaces.filter((s) => s.status !== "operational").length;
                  return (
                    <TabsTrigger key={f.id} value={f.id} className="gap-2">
                      {f.name}
                      {fIssues > 0 && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{fIssues}</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {can("buildings.edit_layout") && (
                <Button
                  size="sm"
                  variant={editMode ? "default" : "outline"}
                  onClick={() => setEditMode((e) => !e)}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  {editMode ? "Editing Layout" : "Edit Layout"}
                </Button>
              )}
            </div>

            {floors.map((f) => (
              <TabsContent key={f.id} value={f.id} className="mt-4">
                {editMode ? (
                  <FloorBuilder
                    floor={f}
                    spaces={spaces.filter((s) => s.floor_id === f.id)}
                    onAdd={addSpace}
                    onAddMany={addManySpaces}
                    onRemove={removeSpace}
                    onPatch={patchSpace}
                    onPatchFloor={(patch) => patchFloor(f.id, patch)}
                    onDone={() => setEditMode(false)}
                  />
                ) : (
                  <FloorGrid
                    floor={f}
                    spaces={spaces.filter((s) => s.floor_id === f.id)}
                    onStatusChange={handleStatusChange}
                    focus={focusSpace}
                    onCreateWorkOrder={(spaceId) => {
                      router.push(`/work-orders/new?space=${spaceId}`);
                    }}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      <PromptDialog
        open={floorPromptOpen}
        onOpenChange={setFloorPromptOpen}
        title="Add a floor"
        label="Floor name"
        placeholder={`Floor ${floors.length + 1}`}
        defaultValue={`Floor ${floors.length + 1}`}
        confirmLabel="Add Floor"
        loading={addingFloor}
        onConfirm={handleAddFloor}
      />
    </div>
  );
}
