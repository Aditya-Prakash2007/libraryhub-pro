"use client";

import { useState, useEffect } from "react";
import { getLibraryFeedbackForSuperAdmin, markLibraryFeedbackAsRead } from "@/actions/feedback";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export function SuperAdminFeedbackClient() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const res = await getLibraryFeedbackForSuperAdmin();
      if (res.success && res.data) {
        setFeedbackList(res.data);
      }
    } catch (error) {
      console.error("Error fetching feedback", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const res = await markLibraryFeedbackAsRead(id);
    if (res.success) {
      setFeedbackList(prev => 
        prev.map(f => f.id === id ? { ...f, isRead: true } : f)
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (feedbackList.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
          <p>No feedback from libraries yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {feedbackList.map((feedback) => (
        <Card key={feedback.id} className={feedback.isRead ? "opacity-75" : "border-l-4 border-l-primary"}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {feedback.library?.name}
                </CardTitle>
                <CardDescription>
                  Submitted by {feedback.library?.admin?.name} ({feedback.library?.admin?.email})
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(feedback.createdAt), "PPP p")}
                </span>
                {!feedback.isRead && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleMarkAsRead(feedback.id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback.featuresToImprove && feedback.featuresToImprove.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Areas for Improvement:</h4>
                <div className="flex flex-wrap gap-2">
                  {feedback.featuresToImprove.map((feature: string) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {feedback.message && (
              <div>
                <h4 className="text-sm font-medium mb-2">Message:</h4>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {feedback.message}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
