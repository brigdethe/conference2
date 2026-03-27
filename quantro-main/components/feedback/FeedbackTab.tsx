import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, Sparkles, BarChart3, MessageSquare, Users, ThumbsUp, ThumbsDown, Clock, Loader2 } from 'lucide-react';

interface FeedbackResponse {
  id: number;
  email: string | null;
  q1_expectations: string;
  q2_had_unclear: string;
  q2_unclear_section: string | null;
  q3_pace: string;
  q4_speaker_improvements: string | null;
  q5_future_topics: string | null;
  q6_attend_again: string;
  created_at: string | null;
}

interface FeedbackStats {
  total_responses: number;
  q1_yes_count: number;
  q1_no_count: number;
  q2_had_unclear_count: number;
  q3_pace_distribution: Record<string, number>;
  q6_rating_distribution: Record<string, number>;
}

export const FeedbackTab: React.FC = () => {
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'responses' | 'analysis'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [responsesRes, statsRes] = await Promise.all([
        fetch('/api/feedback'),
        fetch('/api/feedback/stats')
      ]);
      
      if (responsesRes.ok) {
        const data = await responsesRes.json();
        setResponses(data);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch feedback data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/feedback/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `feedback-responses-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch('/api/feedback/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
        setActiveView('analysis');
      } else {
        const error = await response.json();
        alert(error.detail || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze feedback');
    } finally {
      setAnalyzing(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Amazing': return 'bg-emerald-100 text-emerald-700';
      case 'Good': return 'bg-lime-100 text-lime-700';
      case 'Okay': return 'bg-yellow-100 text-yellow-700';
      case 'Poor': return 'bg-orange-100 text-orange-700';
      case 'Terrible': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRatingEmoji = (rating: string) => {
    switch (rating) {
      case 'Amazing': return '😍';
      case 'Good': return '🙂';
      case 'Okay': return '😐';
      case 'Poor': return '😕';
      case 'Terrible': return '😔';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                Feedback Analysis
              </h2>
              <p className="text-sm text-slate-500">View and analyze attendee feedback</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || responses.length === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Analysis
              </button>
              <button
                onClick={handleExport}
                disabled={responses.length === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={fetchData}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'overview' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveView('responses')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'responses' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Responses ({responses.length})
            </button>
            {analysis && (
              <button
                onClick={() => setActiveView('analysis')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'analysis' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                AI Analysis
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Overview View */}
          {activeView === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4">
                  <div className="text-3xl font-bold text-indigo-600">{stats.total_responses}</div>
                  <div className="text-sm text-indigo-600/70 font-medium">Total Responses</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4">
                  <div className="text-3xl font-bold text-emerald-600 flex items-center gap-2">
                    {stats.q1_yes_count}
                    <ThumbsUp className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-emerald-600/70 font-medium">Met Expectations</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4">
                  <div className="text-3xl font-bold text-red-600 flex items-center gap-2">
                    {stats.q1_no_count}
                    <ThumbsDown className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-red-600/70 font-medium">Did Not Meet</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4">
                  <div className="text-3xl font-bold text-amber-600">{stats.q2_had_unclear_count}</div>
                  <div className="text-sm text-amber-600/70 font-medium">Found Unclear Sections</div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pace Distribution */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Presentation Pace
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.q3_pace_distribution).map(([pace, count]) => {
                      const percentage = stats.total_responses > 0 ? (count / stats.total_responses) * 100 : 0;
                      const icon = pace === 'Too Slow' ? '🐢' : pace === 'Just Right' ? '👌' : '🚀';
                      return (
                        <div key={pace}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{icon} {pace}</span>
                            <span className="text-slate-500">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pace === 'Just Right' ? 'bg-emerald-500' : pace === 'Too Slow' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rating Distribution */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">Likelihood to Attend Again</h3>
                  <div className="space-y-3">
                    {['Amazing', 'Good', 'Okay', 'Poor', 'Terrible'].map((rating) => {
                      const count = stats.q6_rating_distribution[rating] || 0;
                      const percentage = stats.total_responses > 0 ? (count / stats.total_responses) * 100 : 0;
                      return (
                        <div key={rating}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{getRatingEmoji(rating)} {rating}</span>
                            <span className="text-slate-500">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rating === 'Amazing' ? 'bg-emerald-500' :
                                rating === 'Good' ? 'bg-lime-500' :
                                rating === 'Okay' ? 'bg-yellow-500' :
                                rating === 'Poor' ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Responses View */}
          {activeView === 'responses' && (
            <div className="space-y-4">
              {responses.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No feedback responses yet</p>
                </div>
              ) : (
                responses.map((response) => (
                  <div key={response.id} className="bg-gray-50 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(response.q6_attend_again)}`}>
                          {getRatingEmoji(response.q6_attend_again)} {response.q6_attend_again}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          response.q1_expectations === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {response.q1_expectations === 'Yes' ? '✓ Met Expectations' : '✗ Did Not Meet'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {response.created_at ? new Date(response.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Pace:</span>
                        <span className="ml-2 font-medium text-slate-700">{response.q3_pace}</span>
                      </div>
                      {response.email && (
                        <div>
                          <span className="text-slate-500">Email:</span>
                          <span className="ml-2 font-medium text-slate-700">{response.email}</span>
                        </div>
                      )}
                    </div>

                    {response.q2_had_unclear === 'Yes' && response.q2_unclear_section && (
                      <div className="bg-amber-50 rounded-xl p-3">
                        <div className="text-xs font-medium text-amber-600 mb-1">Unclear Section:</div>
                        <p className="text-sm text-amber-800">{response.q2_unclear_section}</p>
                      </div>
                    )}

                    {response.q4_speaker_improvements && (
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="text-xs font-medium text-blue-600 mb-1">Speaker Improvements:</div>
                        <p className="text-sm text-blue-800">{response.q4_speaker_improvements}</p>
                      </div>
                    )}

                    {response.q5_future_topics && (
                      <div className="bg-purple-50 rounded-xl p-3">
                        <div className="text-xs font-medium text-purple-600 mb-1">Future Topics:</div>
                        <p className="text-sm text-purple-800">{response.q5_future_topics}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Analysis View */}
          {activeView === 'analysis' && analysis && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">AI-Generated Analysis</h3>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                {analysis}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
