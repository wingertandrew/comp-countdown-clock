
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Clock, Play, Pause, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { SessionReport, RoundSummary } from '@/types/clock';
import { formatDuration } from '@/utils/clockUtils';

interface ClockReportTabProps {
  sessionReport: SessionReport | null;
  onGenerateReport: () => void;
  onExportReport: (format: 'pdf' | 'csv' | 'png') => void;
}

const ClockReportTab: React.FC<ClockReportTabProps> = ({
  sessionReport,
  onGenerateReport,
  onExportReport
}) => {
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'incomplete':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'with_anomalies':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getValidationColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-500';
      case 'incomplete':
        return 'text-red-500';
      case 'with_anomalies':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const renderTimeline = (round: RoundSummary) => {
    const totalWidth = 400;
    const runPercent = (round.runTime / round.totalTime) * 100;
    const pausePercent = (round.pauseTime / round.totalTime) * 100;
    const betweenPercent = (round.betweenRoundsTime / round.totalTime) * 100;

    return (
      <div className="w-full bg-gray-700 rounded-full h-8 flex items-center overflow-hidden">
        <div 
          className="bg-green-500 h-full flex items-center justify-center text-xs font-bold text-white"
          style={{ width: `${runPercent}%` }}
        >
          {runPercent > 15 && 'RUN'}
        </div>
        <div 
          className="bg-yellow-500 h-full flex items-center justify-center text-xs font-bold text-white"
          style={{ width: `${pausePercent}%` }}
        >
          {pausePercent > 15 && 'PAUSE'}
        </div>
        <div 
          className="bg-purple-500 h-full flex items-center justify-center text-xs font-bold text-white"
          style={{ width: `${betweenPercent}%` }}
        >
          {betweenPercent > 15 && 'BETWEEN'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 min-h-screen bg-gray-900">
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-4xl text-white mb-4 flex items-center gap-3">
            <FileText className="w-10 h-10" />
            Clock Report Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!sessionReport ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl text-white mb-2">No Session Data</h3>
              <p className="text-gray-400 mb-6">Generate a report to see session analytics</p>
              <Button
                onClick={onGenerateReport}
                size="lg"
                className="h-16 px-8 text-xl bg-blue-600 hover:bg-blue-500 text-white"
              >
                <FileText className="w-6 h-6 mr-3" />
                Generate Report
              </Button>
            </div>
          ) : (
            <>
              {/* Session Summary */}
              <Card className="bg-gray-700 border-gray-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3">
                    {getValidationIcon(sessionReport.validationStatus)}
                    Session Summary
                    <Badge className={`ml-2 ${getValidationColor(sessionReport.validationStatus)} bg-transparent border`}>
                      {sessionReport.validationStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {formatDuration(sessionReport.totalRunTime)}
                    </div>
                    <div className="text-gray-300">Total Run Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      {formatDuration(sessionReport.totalPauseTime)}
                    </div>
                    <div className="text-gray-300">Total Pause Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {formatDuration(sessionReport.totalBetweenRoundsTime)}
                    </div>
                    <div className="text-gray-300">Between Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {Math.round((sessionReport.actualTotalTime / sessionReport.expectedTotalTime) * 100)}%
                    </div>
                    <div className="text-gray-300">Completion</div>
                  </div>
                </CardContent>
              </Card>

              {/* Anomalies */}
              {sessionReport.anomalies.length > 0 && (
                <Card className="bg-red-900/20 border-red-500/50">
                  <CardHeader>
                    <CardTitle className="text-xl text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6" />
                      Anomalies Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sessionReport.anomalies.map((anomaly, index) => (
                        <div key={index} className="flex items-center gap-2 text-red-300">
                          <AlertTriangle className="w-4 h-4" />
                          {anomaly}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Round Breakdown */}
              <Card className="bg-gray-700 border-gray-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Round Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sessionReport.rounds.map((round) => (
                    <div key={round.round} className="bg-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          Round {round.round}
                          {round.anomalies.length > 0 && (
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          )}
                        </h3>
                        <div className="flex gap-2">
                          <Badge className="bg-green-600 text-white">
                            Run: {formatDuration(round.runTime)}
                          </Badge>
                          {round.pauseTime > 0 && (
                            <Badge className="bg-yellow-600 text-white">
                              Pause: {formatDuration(round.pauseTime)}
                            </Badge>
                          )}
                          {round.betweenRoundsTime > 0 && (
                            <Badge className="bg-purple-600 text-white">
                              Between: {formatDuration(round.betweenRoundsTime)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Timeline */}
                      <div className="mb-3">
                        {renderTimeline(round)}
                      </div>
                      
                      {/* Round Anomalies */}
                      {round.anomalies.length > 0 && (
                        <div className="text-sm text-yellow-300">
                          {round.anomalies.map((anomaly, index) => (
                            <div key={index} className="flex items-center gap-1">
                              🚩 {anomaly}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card className="bg-gray-700 border-gray-500">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Download className="w-6 h-6" />
                    Export Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={() => onExportReport('pdf')}
                      className="bg-red-600 hover:bg-red-500 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      onClick={() => onExportReport('csv')}
                      className="bg-green-600 hover:bg-green-500 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => onExportReport('png')}
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export PNG
                    </Button>
                    <Button
                      onClick={onGenerateReport}
                      variant="outline"
                      className="border-gray-500 text-white hover:bg-gray-600"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Refresh Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClockReportTab;
