"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Star, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS, REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS } from "@/lib/constants"
import { formatDate, cn } from "@/lib/utils"

interface ReviewCycle {
  id: string
  name: string
  year: number
  quarter: number | null
  startDate: string
  endDate: string
  isActive: boolean
  _count: { reviews: number }
}

interface Review {
  id: string
  status: string
  selfRating: number | null
  managerRating: number | null
  finalRating: number | null
  reviewee: { id: string; firstName: string; lastName: string; employeeNo: string; department: { name: string } | null; designation: { title: string } | null }
  reviewer: { id: string; firstName: string; lastName: string } | null
  cycle: { name: string; year: number }
}

async function fetchCycles(): Promise<{ data: ReviewCycle[] }> {
  const res = await fetch("/api/performance/cycles")
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function fetchReviews(cycleId: string): Promise<{ data: Review[] }> {
  const res = await fetch(`/api/performance/reviews?cycleId=${cycleId}`)
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function createCycle(body: Record<string, unknown>) {
  const res = await fetch("/api/performance/cycles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

async function updateReview(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/performance/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error("Failed")
  return res.json()
}

function RatingStars({ value }: { value: number | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value}/5</span>
    </div>
  )
}

export default function PerformancePage() {
  const { can } = usePermissions()
  const canReview = can(PERMISSIONS.PERFORMANCE_REVIEW)
  const qc = useQueryClient()

  const { data: cyclesData, isLoading: cyclesLoading } = useQuery({ queryKey: ["review-cycles"], queryFn: fetchCycles })
  const cycles = cyclesData?.data ?? []
  const [selectedCycle, setSelectedCycle] = useState<string>("")
  const activeCycle = cycles.find(c => c.isActive)?.id ?? cycles[0]?.id ?? ""
  const cycleId = selectedCycle || activeCycle

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews", cycleId],
    queryFn: () => fetchReviews(cycleId),
    enabled: !!cycleId,
  })
  const reviews = reviewsData?.data ?? []

  const [cycleOpen, setCycleOpen] = useState(false)
  const [cycleForm, setCycleForm] = useState({ name: "", year: String(new Date().getFullYear()), quarter: "", startDate: "", endDate: "" })

  const [reviewOpen, setReviewOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [reviewForm, setReviewForm] = useState({ managerRating: "", managerComments: "" })

  const createCycleMut = useMutation({
    mutationFn: createCycle,
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["review-cycles"] }); toast.success(`Cycle created — ${data.reviewsCreated} reviews generated`); setCycleOpen(false) },
    onError: () => toast.error("Failed to create cycle"),
  })

  const completeReviewMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => updateReview(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews", cycleId] }); toast.success("Review completed"); setReviewOpen(false) },
    onError: () => toast.error("Failed to update review"),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Reviews"
        description="Manage review cycles and employee evaluations"
        actions={canReview ? (
          <Button onClick={() => setCycleOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Cycle
          </Button>
        ) : undefined}
      />

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex items-center gap-3">
          <Select value={cycleId} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-64 h-8 text-sm">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — {c.year}{c.quarter ? ` Q${c.quarter}` : ""} ({c._count.reviews} reviews)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {cyclesLoading || reviewsLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-lg border bg-card text-center">
          <Star className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">{cycles.length === 0 ? "No review cycles yet. Create one to get started." : "No reviews in this cycle."}</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Self Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Manager Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Final</th>
                {canReview && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews.map(review => (
                <tr key={review.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{review.reviewee.firstName} {review.reviewee.lastName}</p>
                      <p className="text-xs text-muted-foreground">{review.reviewee.designation?.title ?? "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{review.reviewee.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", REVIEW_STATUS_COLORS[review.status])}>
                      {REVIEW_STATUS_LABELS[review.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3"><RatingStars value={review.selfRating} /></td>
                  <td className="px-4 py-3"><RatingStars value={review.managerRating} /></td>
                  <td className="px-4 py-3"><RatingStars value={review.finalRating} /></td>
                  {canReview && (
                    <td className="px-4 py-3 text-right">
                      {review.status !== "COMPLETED" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedReview(review); setReviewForm({ managerRating: review.managerRating?.toString() ?? "", managerComments: "" }); setReviewOpen(true) }}>
                          Review
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create cycle dialog */}
      <Dialog open={cycleOpen} onOpenChange={setCycleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Review Cycle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cycle Name</Label>
              <Input value={cycleForm.name} onChange={e => setCycleForm(f => ({ ...f, name: e.target.value }))} placeholder="Annual Review 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={cycleForm.year} onChange={e => setCycleForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Quarter (optional)</Label>
                <Select value={cycleForm.quarter} onValueChange={v => setCycleForm(f => ({ ...f, quarter: v }))}>
                  <SelectTrigger><SelectValue placeholder="Annual" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={cycleForm.startDate} onChange={e => setCycleForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={cycleForm.endDate} onChange={e => setCycleForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCycleOpen(false)}>Cancel</Button>
            <Button onClick={() => createCycleMut.mutate(cycleForm)} disabled={createCycleMut.isPending || !cycleForm.name || !cycleForm.startDate || !cycleForm.endDate}>
              {createCycleMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create & Generate Reviews
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager review dialog */}
      {selectedReview && (
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Review — {selectedReview.reviewee.firstName} {selectedReview.reviewee.lastName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedReview.selfRating && (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Self Assessment</p>
                  <RatingStars value={selectedReview.selfRating} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Manager Rating (1–5)</Label>
                <Input type="number" min={1} max={5} step={0.5} value={reviewForm.managerRating} onChange={e => setReviewForm(f => ({ ...f, managerRating: e.target.value }))} placeholder="4.0" />
              </div>
              <div className="space-y-1.5">
                <Label>Comments</Label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring" value={reviewForm.managerComments} onChange={e => setReviewForm(f => ({ ...f, managerComments: e.target.value }))} placeholder="Manager feedback..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
              <Button onClick={() => completeReviewMut.mutate({ id: selectedReview.id, managerRating: reviewForm.managerRating, managerComments: reviewForm.managerComments, status: "COMPLETED" })} disabled={completeReviewMut.isPending || !reviewForm.managerRating}>
                {completeReviewMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Complete Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
