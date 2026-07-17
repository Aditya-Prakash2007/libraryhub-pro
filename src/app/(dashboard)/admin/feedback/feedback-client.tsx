"use client";

import { useState, useEffect } from "react";
import {
  getStudentFeedbackForLibrary,
  submitLibraryFeedback,
  markStudentFeedbackAsRead,
  replyToStudentFeedback,
} from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Send, MessageSquare, CheckCircle2, Reply, MailCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const FEEDBACK_FEATURES = [
  "UI Improvements",
  "Feature Requests",
  "Bug Reports",
  "Performance",
  "Customer Support",
  "Other",
];

interface FeedbackItem {
  id: string;
  message: string;
  isRead: boolean;
  adminReply?: string | null;
  repliedAt?: Date | string | null;
  createdAt: Date | string;
  student?: { fullName: string; studentId: string } | null;
}

export function AdminFeedbackClient({ libraryId }: { libraryId: string }) {
  const [studentFeedback, setStudentFeedback] = useState<FeedbackItem[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudentFeedback();
  }, [libraryId]);

  const fetchStudentFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const res = await getStudentFeedbackForLibrary(libraryId);
      if (res.success && res.data) {
        setStudentFeedback(res.data as FeedbackItem[]);
      }
    } catch (error) {
      console.error("Error fetching feedback", error);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const res = await markStudentFeedbackAsRead(id);
    if (res.success) {
      setStudentFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, isRead: true } : f)));
    }
  };

  const handleSendReply = async (feedback: FeedbackItem) => {
    const reply = replyText[feedback.id]?.trim();
    if (!reply) { toast.error("Please write a reply before sending."); return; }

    setSendingReply(feedback.id);
    const res = await replyToStudentFeedback(feedback.id, reply);
    setSendingReply(null);

    if (res.success) {
      toast.success("Reply sent! Student will receive an email.");
      setStudentFeedback((prev) =>
        prev.map((f) =>
          f.id === feedback.id
            ? { ...f, adminReply: reply, repliedAt: new Date().toISOString(), isRead: true }
            : f
        )
      );
      setReplyingId(null);
      setReplyText((prev) => { const c = { ...prev }; delete c[feedback.id]; return c; });
    } else {
      toast.error(res.error || "Failed to send reply.");
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const handleSubmitAdminFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFeatures.length === 0 && !message.trim()) {
      toast.error("Please select at least one feature or write a message.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await submitLibraryFeedback({ libraryId, featuresToImprove: selectedFeatures, message });
      if (res.success) {
        toast.success("Feedback submitted to Super Admin!");
        setSelectedFeatures([]);
        setMessage("");
      } else {
        toast.error(res.error || "Failed to submit feedback");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const unreadCount = studentFeedback.filter((f) => !f.isRead).length;

  return (
    <Tabs defaultValue="student-feedback" className="space-y-6">
      <TabsList>
        <TabsTrigger value="student-feedback">
          Student Feedback
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-indigo-500 text-white">
              {unreadCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="send-feedback">Send Feedback to Admin</TabsTrigger>
      </TabsList>

      <TabsContent value="student-feedback" className="space-y-4">
        {isLoadingFeedback ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : studentFeedback.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <p>No feedback from students yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {studentFeedback.map((feedback) => (
              <Card
                key={feedback.id}
                className={feedback.isRead ? "opacity-80" : "border-l-4 border-l-indigo-500"}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {feedback.student?.fullName}{" "}
                        <span className="text-muted-foreground font-normal text-xs">
                          ({feedback.student?.studentId})
                        </span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(feedback.createdAt), "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    {feedback.adminReply && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                        <MailCheck className="w-3 h-3" /> Replied
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Student message */}
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-lg px-3 py-2">
                    {feedback.message}
                  </p>

                  {/* Admin reply (if already sent) */}
                  {feedback.adminReply && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1">
                        Your Reply
                      </p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{feedback.adminReply}</p>
                      {feedback.repliedAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Sent {format(new Date(feedback.repliedAt), "d MMM yyyy, h:mm a")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reply textarea (when replying) */}
                  {replyingId === feedback.id && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your reply to the student..."
                        rows={3}
                        value={replyText[feedback.id] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [feedback.id]: e.target.value }))
                        }
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSendReply(feedback)}
                          loading={sendingReply === feedback.id}
                          className="bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Send Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setReplyingId(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {replyingId !== feedback.id && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingId(feedback.id)}
                        className="text-indigo-500 border-indigo-500/30 hover:bg-indigo-500/10"
                      >
                        <Reply className="w-3.5 h-3.5 mr-1" />
                        {feedback.adminReply ? "Edit Reply" : "Reply"}
                      </Button>
                      {!feedback.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(feedback.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark as Read
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="send-feedback">
        <Card>
          <CardHeader>
            <CardTitle>Feedback for Super Admin</CardTitle>
            <CardDescription>
              Help us improve LibraryHub Pro. Select areas that need attention and share your thoughts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitAdminFeedback} className="space-y-6 max-w-2xl">
              <div className="space-y-3">
                <label className="text-sm font-medium">Areas to Improve (Select applicable)</label>
                <div className="grid grid-cols-2 gap-4">
                  {FEEDBACK_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature}
                        checked={selectedFeatures.includes(feature)}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                      <label htmlFor={feature} className="text-sm font-medium leading-none">
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="admin-feedback" className="text-sm font-medium">
                  Additional Comments
                </label>
                <Textarea
                  id="admin-feedback"
                  placeholder="Describe your feedback, issues, or feature requests in detail..."
                  className="min-h-[120px] resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || (selectedFeatures.length === 0 && !message.trim())}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Submit Feedback</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
