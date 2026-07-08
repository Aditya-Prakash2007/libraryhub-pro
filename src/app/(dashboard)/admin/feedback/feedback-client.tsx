"use client";

import { useState, useEffect } from "react";
import { getStudentFeedbackForLibrary, submitLibraryFeedback, markStudentFeedbackAsRead } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Send, MessageSquare, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const FEEDBACK_FEATURES = [
  "UI Improvements",
  "Feature Requests",
  "Bug Reports",
  "Performance",
  "Customer Support",
  "Other"
];

export function AdminFeedbackClient({ libraryId }: { libraryId: string }) {
  const [studentFeedback, setStudentFeedback] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  
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
        setStudentFeedback(res.data);
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
      setStudentFeedback(prev => 
        prev.map(f => f.id === id ? { ...f, isRead: true } : f)
      );
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmitAdminFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFeatures.length === 0 && !message.trim()) {
      toast.error("Validation Error", {
        description: "Please select at least one feature or write a message.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitLibraryFeedback({
        libraryId,
        featuresToImprove: selectedFeatures,
        message,
      });

      if (res.success) {
        toast.success("Feedback Submitted", {
          description: "Thank you for your feedback to the Super Admin!",
        });
        setSelectedFeatures([]);
        setMessage("");
      } else {
        toast.error("Error", {
          description: res.error || "Failed to submit feedback",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tabs defaultValue="student-feedback" className="space-y-6">
      <TabsList>
        <TabsTrigger value="student-feedback">Student Feedback</TabsTrigger>
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
              <Card key={feedback.id} className={feedback.isRead ? "opacity-75" : "border-l-4 border-l-primary"}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold">
                      {feedback.student?.fullName} ({feedback.student?.studentId})
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(feedback.createdAt), "PPP p")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm whitespace-pre-wrap">{feedback.message}</p>
                  
                  {!feedback.isRead && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleMarkAsRead(feedback.id)}
                      className="w-full sm:w-auto"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Read
                    </Button>
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
              Help us improve LibraryHub Pro. Select areas that need attention and provide your thoughts.
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
                      <label 
                        htmlFor={feature} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
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

              <Button type="submit" disabled={isSubmitting || (selectedFeatures.length === 0 && !message.trim())}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
