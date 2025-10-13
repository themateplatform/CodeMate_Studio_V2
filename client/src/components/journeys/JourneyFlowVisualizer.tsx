import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, AlertCircle, User } from "lucide-react";

interface JourneyStep {
  step: string;
  description: string;
  touchpoints?: string[];
  expectations?: string;
}

interface UserJourney {
  id: string;
  name: string;
  description: string;
  userType: string;
  steps: JourneyStep[];
  successCriteria?: string[];
  painPoints?: string[];
  priority: "high" | "medium" | "low";
  status: "draft" | "reviewed" | "implemented";
}

interface JourneyFlowVisualizerProps {
  journey: UserJourney;
}

export function JourneyFlowVisualizer({ journey }: JourneyFlowVisualizerProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-50";
      case "medium":
        return "border-yellow-500 bg-yellow-50";
      case "low":
        return "border-green-500 bg-green-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "implemented":
        return "text-green-600";
      case "reviewed":
        return "text-blue-600";
      case "draft":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Journey Header */}
      <Card className={`border-2 ${getPriorityColor(journey.priority)}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-xl">{journey.name}</CardTitle>
                <Badge variant="outline" className={getStatusColor(journey.status)}>
                  {journey.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{journey.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {journey.userType}
                </Badge>
                <span className="text-xs text-gray-500">
                  {journey.steps.length} steps
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Pain Points */}
      {journey.painPoints && journey.painPoints.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Pain Points Addressed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {journey.painPoints.map((pain, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>{pain}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Journey Flow */}
      <div className="relative">
        <div className="space-y-4">
          {journey.steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step Card */}
              <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{step.step}</h4>
                      <p className="text-xs text-gray-600 mb-2">{step.description}</p>

                      {step.expectations && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mt-2">
                          <p className="text-xs text-blue-800">
                            <span className="font-medium">User Expects:</span>{" "}
                            {step.expectations}
                          </p>
                        </div>
                      )}

                      {step.touchpoints && step.touchpoints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {step.touchpoints.map((touchpoint, tIndex) => (
                            <Badge key={tIndex} variant="outline" className="text-xs">
                              {touchpoint}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow Connector */}
              {index < journey.steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="h-6 w-6 text-blue-500 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Success Criteria */}
      {journey.successCriteria && journey.successCriteria.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Success Criteria</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {journey.successCriteria.map((criteria, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Journey Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Journey Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Total Steps</p>
              <p className="font-semibold text-lg">{journey.steps.length}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Priority</p>
              <Badge variant="outline" className="capitalize">
                {journey.priority}
              </Badge>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Status</p>
              <Badge variant="outline" className="capitalize">
                {journey.status}
              </Badge>
            </div>
            <div>
              <p className="text-gray-600 mb-1">User Type</p>
              <p className="font-medium">{journey.userType}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
