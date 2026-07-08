"use client";

import { useState } from "react";
import { submitStudentFeedback } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

export function StudentFeedbackClient({
  studentId,
  libraryId,
}: {
  studentId: string;
  libraryId: string;
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await submitStudentFeedback({
        studentId,
        libraryId,
        message,
      });

      if (res.success) {
        toast.success("Feedback Submitted", {
          description: "Thank you for your feedback!",
        });
        setMessage("");
      } else {
        toast.error("Error", {
          description: res.error || "Failed to submit feedback",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mt-4">
      <div className="space-y-2">
        <label htmlFor="feedback" className="text-sm font-medium">
          Your Feedback
        </label>
        <Textarea
          id="feedback"
          placeholder="Tell us what you think about the library, any issues you're facing, or suggestions for improvement..."
          className="min-h-[150px] resize-y"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" disabled={isSubmitting || !message.trim()}>
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
  );
}
