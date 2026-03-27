import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Download, Sparkles, BarChart3, MessageSquare, Users, ThumbsUp, Clock, Loader2, TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Hash, Star, CheckCircle, XCircle, Send, UserCheck, Trash2 } from 'lucide-react';

interface FeedbackResponse {
  id: number;
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
  q1_distribution: Record<string, number>;
  q2_had_unclear_count: number;
  q3_pace_distribution: Record<string, number>;
  q6_distribution: Record<string, number>;
}

interface SurveyInvite {
  token: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: 'attendee' | 'custom' | 'test' | 'unknown';
  sent_at: string | null;
  opened_at: string | null;
  status: 'sent' | 'opened' | 'completed';
  completed: boolean;
  completed_at: string | null;
}

interface InviteTrackingData {
  invites: SurveyInvite[];
  total: number;
  completed: number;
  opened: number;
  pending: number;
}

export const FeedbackTab: React.FC = () => {
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'responses' | 'tracking' | 'analysis'>('overview');
  const [expandedResponse, setExpandedResponse] = useState<number | null>(null);
  const [inviteData, setInviteData] = useState<InviteTrackingData | null>(null);
  const [inviteFilter, setInviteFilter] = useState<'all' | 'pending' | 'opened' | 'completed' | 'custom' | 'attendee'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [responsesRes, statsRes, invitesRes] = await Promise.all([
        fetch('/api/feedback'),
        fetch('/api/feedback/stats'),
        fetch('/api/feedback/invites')
      ]);
      
      if (responsesRes.ok) {
        const data = await responsesRes.json();
        setResponses(data);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInviteData(data);
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

  const handleResetFeedback = async () => {
    const pin = prompt('Enter PIN to reset all feedback data:');
    if (!pin) return;
    
    if (!confirm('This will permanently delete ALL feedback responses and invite tracking data. Are you sure?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/feedback/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || 'Feedback reset successfully');
        fetchData();
      } else {
        alert(data.detail || 'Reset failed - incorrect PIN');
      }
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset feedback');
    }
  };

  // Computed metrics
  const metrics = useMemo(() => {
    if (!stats || stats.total_responses === 0) return null;
    const t = stats.total_responses;
    const q1Scores: Record<string, number> = { Terrible: 1, Poor: 2, Okay: 3, Good: 4, Amazing: 5 };
    const q6Scores: Record<string, number> = { 'Very Unlikely': 1, 'Unlikely': 2, 'Maybe': 3, 'Likely': 4, 'Very Likely': 5 };

    let q1Total = 0, q6Total = 0;
    Object.entries(stats.q1_distribution).forEach(([k, v]) => { q1Total += (q1Scores[k] || 0) * v; });
    Object.entries(stats.q6_distribution).forEach(([k, v]) => { q6Total += (q6Scores[k] || 0) * v; });

    const satisfactionScore = ((q1Total / t) / 5 * 100).toFixed(0);
    const returnScore = ((q6Total / t) / 5 * 100).toFixed(0);
    const positiveCount = (stats.q1_distribution['Good'] || 0) + (stats.q1_distribution['Amazing'] || 0);
    const positiveRate = ((positiveCount / t) * 100).toFixed(0);
    const unclearRate = ((stats.q2_had_unclear_count / t) * 100).toFixed(0);
    const paceJustRight = stats.q3_pace_distribution['Just Right'] || 0;
    const paceRate = ((paceJustRight / t) * 100).toFixed(0);

    return { satisfactionScore, returnScore, positiveRate, unclearRate, paceRate, positiveCount };
  }, [stats]);

  // Aggregate open-ended responses
  const openEndedData = useMemo(() => {
    const unclear = responses.filter(r => r.q2_had_unclear === 'Yes' && r.q2_unclear_section).map(r => r.q2_unclear_section!);
    const improvements = responses.filter(r => r.q4_speaker_improvements).map(r => r.q4_speaker_improvements!);
    const topics = responses.filter(r => r.q5_future_topics).map(r => r.q5_future_topics!);
    return { unclear, improvements, topics };
  }, [responses]);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Amazing': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Good': return 'bg-lime-100 text-lime-700 border-lime-200';
      case 'Okay': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Poor': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Terrible': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const getLikertColor = (val: string) => {
    switch (val) {
      case 'Very Likely': return 'bg-emerald-100 text-emerald-700';
      case 'Likely': return 'bg-lime-100 text-lime-700';
      case 'Maybe': return 'bg-yellow-100 text-yellow-700';
      case 'Unlikely': return 'bg-orange-100 text-orange-700';
      case 'Very Unlikely': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-500">Loading feedback data...</p>
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
                Feedback Dashboard
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {responses.length} response{responses.length !== 1 ? 's' : ''} collected
                {responses.length > 0 && stats && ` · ${metrics?.satisfactionScore}% satisfaction`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                CSV
              </button>
              <button
                onClick={fetchData}
                className="p-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetFeedback}
                className="p-2 rounded-xl text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="Reset All Feedback"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-4">
            {(['overview', 'responses', 'tracking', ...(analysis ? ['analysis'] : [])] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveView(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeView === tab ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'overview' && <BarChart3 className="w-4 h-4" />}
                {tab === 'responses' && <Users className="w-4 h-4" />}
                {tab === 'tracking' && <UserCheck className="w-4 h-4" />}
                {tab === 'analysis' && <Sparkles className="w-4 h-4" />}
                {tab === 'overview' ? 'Overview' : tab === 'responses' ? `Responses (${responses.length})` : tab === 'tracking' ? `Tracking${inviteData ? ` (${inviteData.completed}/${inviteData.total})` : ''}` : 'AI Analysis'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* No data state */}
          {responses.length === 0 && activeView !== 'analysis' && activeView !== 'tracking' && (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Feedback Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Send survey invitations from the Settings tab to start collecting attendee feedback.
              </p>
            </div>
          )}

          {/* ============== OVERVIEW VIEW ============== */}
          {activeView === 'overview' && stats && responses.length > 0 && (
            <div className="space-y-6">
              {/* KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-500 uppercase tracking-wide">Responses</span>
                  </div>
                  <div className="text-3xl font-bold text-indigo-700">{stats.total_responses}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Satisfaction</span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-700">{metrics?.satisfactionScore}%</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-blue-500 uppercase tracking-wide">Return Intent</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">{metrics?.returnScore}%</div>
                </div>
                <div className="bg-gradient-to-br from-lime-50 to-lime-100/50 rounded-2xl p-4 border border-lime-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-4 h-4 text-lime-500" />
                    <span className="text-xs font-medium text-lime-600 uppercase tracking-wide">Positive</span>
                  </div>
                  <div className="text-3xl font-bold text-lime-700">{metrics?.positiveRate}%</div>
                  <div className="text-xs text-lime-600 mt-0.5">{metrics?.positiveCount} rated Good+</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">Unclear</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-700">{metrics?.unclearRate}%</div>
                  <div className="text-xs text-amber-600 mt-0.5">{stats.q2_had_unclear_count} flagged</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Q1 Expectations */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-semibold text-slate-800 mb-1 text-sm">How well did the seminar meet expectations?</h3>
                  <p className="text-xs text-slate-400 mb-4">Q1 · Emoji Rating</p>
                  <div className="space-y-2.5">
                    {['Amazing', 'Good', 'Okay', 'Poor', 'Terrible'].map((rating) => {
                      const count = stats.q1_distribution[rating] || 0;
                      const pct = stats.total_responses > 0 ? (count / stats.total_responses) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="text-lg w-7 text-center">{getRatingEmoji(rating)}</span>
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded-lg overflow-hidden relative">
                              <div
                                className={`h-full rounded-lg transition-all ${
                                  rating === 'Amazing' ? 'bg-emerald-500' :
                                  rating === 'Good' ? 'bg-lime-500' :
                                  rating === 'Okay' ? 'bg-yellow-400' :
                                  rating === 'Poor' ? 'bg-orange-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
                                {rating}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-14 text-right">{count} · {pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pace */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-semibold text-slate-800 mb-1 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    How was the presentation pace?
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Q3 · Single Choice</p>
                  <div className="space-y-2.5">
                    {['Too Slow', 'Just Right', 'Too Fast'].map((pace) => {
                      const count = stats.q3_pace_distribution[pace] || 0;
                      const pct = stats.total_responses > 0 ? (count / stats.total_responses) * 100 : 0;
                      const icon = pace === 'Too Slow' ? '🐢' : pace === 'Just Right' ? '👌' : '🚀';
                      return (
                        <div key={pace} className="flex items-center gap-3">
                          <span className="text-lg w-7 text-center">{icon}</span>
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded-lg overflow-hidden relative">
                              <div
                                className={`h-full rounded-lg transition-all ${
                                  pace === 'Just Right' ? 'bg-emerald-500' : pace === 'Too Slow' ? 'bg-amber-400' : 'bg-blue-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
                                {pace}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-14 text-right">{count} · {pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-emerald-600">{metrics?.paceRate}%</span>
                      <p className="text-xs text-slate-500 mt-1">found the pace "Just Right"</p>
                    </div>
                  </div>
                </div>

                {/* Q6 Return Likelihood */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-semibold text-slate-800 mb-1 text-sm">Would you attend again?</h3>
                  <p className="text-xs text-slate-400 mb-4">Q6 · Likert Scale</p>
                  <div className="space-y-2.5">
                    {['Very Likely', 'Likely', 'Maybe', 'Unlikely', 'Very Unlikely'].map((val) => {
                      const count = stats.q6_distribution[val] || 0;
                      const pct = stats.total_responses > 0 ? (count / stats.total_responses) * 100 : 0;
                      return (
                        <div key={val} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded-lg overflow-hidden relative">
                              <div
                                className={`h-full rounded-lg transition-all ${
                                  val === 'Very Likely' ? 'bg-emerald-500' :
                                  val === 'Likely' ? 'bg-lime-500' :
                                  val === 'Maybe' ? 'bg-yellow-400' :
                                  val === 'Unlikely' ? 'bg-orange-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
                                {val}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-14 text-right">{count} · {pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Open-ended Insights */}
              {(openEndedData.unclear.length > 0 || openEndedData.improvements.length > 0 || openEndedData.topics.length > 0) && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Open-Ended Feedback Summary
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {openEndedData.unclear.length > 0 && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="text-sm font-semibold text-amber-800">Unclear Sections ({openEndedData.unclear.length})</h4>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {openEndedData.unclear.map((text, i) => (
                            <p key={i} className="text-xs text-amber-900 bg-white rounded-lg p-2 border border-amber-100">"{text}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {openEndedData.improvements.length > 0 && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          <h4 className="text-sm font-semibold text-blue-800">Speaker Improvements ({openEndedData.improvements.length})</h4>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {openEndedData.improvements.map((text, i) => (
                            <p key={i} className="text-xs text-blue-900 bg-white rounded-lg p-2 border border-blue-100">"{text}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {openEndedData.topics.length > 0 && (
                      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-4 h-4 text-purple-500" />
                          <h4 className="text-sm font-semibold text-purple-800">Future Topics ({openEndedData.topics.length})</h4>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {openEndedData.topics.map((text, i) => (
                            <p key={i} className="text-xs text-purple-900 bg-white rounded-lg p-2 border border-purple-100">"{text}"</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============== RESPONSES VIEW ============== */}
          {activeView === 'responses' && responses.length > 0 && (
            <div className="space-y-3">
              {/* Response header */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                <span>Showing {responses.length} response{responses.length !== 1 ? 's' : ''}</span>
                <span>Click to expand details</span>
              </div>
              {responses.map((response) => {
                const isExpanded = expandedResponse === response.id;
                const hasDetails = response.q2_unclear_section || response.q4_speaker_improvements || response.q5_future_topics;
                return (
                  <div
                    key={response.id}
                    className={`rounded-2xl border transition-all cursor-pointer ${
                      isExpanded ? 'border-indigo-200 bg-white shadow-md' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                    }`}
                    onClick={() => setExpandedResponse(isExpanded ? null : response.id)}
                  >
                    {/* Collapsed row */}
                    <div className="flex items-center gap-3 p-4">
                      <span className="text-xl">{getRatingEmoji(response.q1_expectations)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRatingColor(response.q1_expectations)}`}>
                            {response.q1_expectations}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getLikertColor(response.q6_attend_again)}`}>
                            {response.q6_attend_again}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {response.q3_pace}
                          </span>
                          {response.q2_had_unclear === 'Yes' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              ⚠️ Had unclear sections
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {response.created_at ? new Date(response.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        {hasDetails && (
                          isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                        <div className="grid grid-cols-3 gap-3 pt-3">
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-xs text-slate-500 mb-1">Expectations</div>
                            <div className="text-lg">{getRatingEmoji(response.q1_expectations)}</div>
                            <div className="text-xs font-semibold text-slate-700">{response.q1_expectations}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-xs text-slate-500 mb-1">Pace</div>
                            <div className="text-lg">{response.q3_pace === 'Too Slow' ? '🐢' : response.q3_pace === 'Just Right' ? '👌' : '🚀'}</div>
                            <div className="text-xs font-semibold text-slate-700">{response.q3_pace}</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-xs text-slate-500 mb-1">Attend Again</div>
                            <div className="text-lg">{response.q6_attend_again === 'Very Likely' ? '🤩' : response.q6_attend_again === 'Likely' ? '👍' : response.q6_attend_again === 'Maybe' ? '🤔' : '👎'}</div>
                            <div className="text-xs font-semibold text-slate-700">{response.q6_attend_again}</div>
                          </div>
                        </div>

                        {response.q2_had_unclear === 'Yes' && response.q2_unclear_section && (
                          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                            <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Unclear Section
                            </div>
                            <p className="text-sm text-amber-900">{response.q2_unclear_section}</p>
                          </div>
                        )}

                        {response.q4_speaker_improvements && (
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <div className="text-xs font-semibold text-blue-700 mb-1">💡 Speaker Improvements</div>
                            <p className="text-sm text-blue-900">{response.q4_speaker_improvements}</p>
                          </div>
                        )}

                        {response.q5_future_topics && (
                          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                            <div className="text-xs font-semibold text-purple-700 mb-1">📌 Future Topics</div>
                            <p className="text-sm text-purple-900">{response.q5_future_topics}</p>
                          </div>
                        )}

                        {!response.q2_unclear_section && !response.q4_speaker_improvements && !response.q5_future_topics && (
                          <p className="text-xs text-slate-400 italic text-center py-2">No open-ended feedback provided</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ============== TRACKING VIEW ============== */}
          {activeView === 'tracking' && (
            <div className="space-y-4">
              {!inviteData || inviteData.total === 0 ? (
                <div className="text-center py-16">
                  <Send className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Invites Tracked Yet</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Survey invites sent from now on will be tracked here. Send invites from the Settings tab.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-4 border border-indigo-100 text-center">
                      <div className="text-3xl font-bold text-indigo-700">{inviteData.total}</div>
                      <div className="text-xs font-medium text-indigo-500 mt-1">Total Sent</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 border border-emerald-100 text-center">
                      <div className="text-3xl font-bold text-emerald-700">{inviteData.completed}</div>
                      <div className="text-xs font-medium text-emerald-500 mt-1">Filled Survey</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4 border border-blue-100 text-center">
                      <div className="text-3xl font-bold text-blue-700">{inviteData.opened}</div>
                      <div className="text-xs font-medium text-blue-500 mt-1">Opened Link</div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-4 border border-slate-200 text-center">
                      <div className="text-3xl font-bold text-slate-600">{inviteData.pending}</div>
                      <div className="text-xs font-medium text-slate-400 mt-1">Not Opened</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">Survey Funnel</span>
                      <span className="font-bold text-slate-900">{inviteData.total > 0 ? ((inviteData.completed / inviteData.total) * 100).toFixed(0) : 0}% completed</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                      {inviteData.total > 0 && (
                        <>
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(inviteData.completed / inviteData.total) * 100}%` }} />
                          <div className="h-full bg-blue-400 transition-all" style={{ width: `${(inviteData.opened / inviteData.total) * 100}%` }} />
                        </>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Filled</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Opened</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Not opened</span>
                    </div>
                  </div>

                  {/* Filter buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { key: 'all', label: `All (${inviteData.total})` },
                      { key: 'pending', label: `Not Opened (${inviteData.pending})` },
                      { key: 'opened', label: `Opened (${inviteData.opened})` },
                      { key: 'completed', label: `Filled (${inviteData.completed})` },
                      { key: 'custom', label: `Custom` },
                      { key: 'attendee', label: `Attendees` },
                    ] as const).map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setInviteFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          inviteFilter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Invite list */}
                  <div className="space-y-2">
                    {inviteData.invites
                      .filter((inv) => {
                        if (inviteFilter === 'pending') return inv.status === 'sent';
                        if (inviteFilter === 'opened') return inv.status === 'opened';
                        if (inviteFilter === 'completed') return inv.status === 'completed';
                        if (inviteFilter === 'custom') return inv.type === 'custom';
                        if (inviteFilter === 'attendee') return inv.type === 'attendee';
                        return true;
                      })
                      .map((inv, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            inv.status === 'completed' ? 'bg-emerald-50/50 border-emerald-100' :
                            inv.status === 'opened' ? 'bg-blue-50/50 border-blue-100' :
                            'bg-white border-gray-100'
                          }`}
                        >
                          {inv.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : inv.status === 'opened' ? (
                            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800">{inv.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                                inv.type === 'custom' ? 'bg-indigo-100 text-indigo-600' :
                                inv.type === 'test' ? 'bg-amber-100 text-amber-600' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {inv.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                              {inv.email && <span>{inv.email}</span>}
                              {inv.phone && <span>{inv.phone}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {inv.status === 'completed' ? (
                              <div>
                                <div className="text-xs font-semibold text-emerald-600">Filled</div>
                                <div className="text-[10px] text-emerald-400">
                                  {inv.completed_at ? new Date(inv.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                                </div>
                              </div>
                            ) : inv.status === 'opened' ? (
                              <div>
                                <div className="text-xs font-semibold text-blue-500">Opened</div>
                                <div className="text-[10px] text-blue-400">
                                  {inv.opened_at ? new Date(inv.opened_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-xs font-semibold text-slate-400">Sent</div>
                                <div className="text-[10px] text-slate-300">
                                  {inv.sent_at ? new Date(inv.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {inviteData.invites.filter((inv) => {
                      if (inviteFilter === 'pending') return inv.status === 'sent';
                      if (inviteFilter === 'opened') return inv.status === 'opened';
                      if (inviteFilter === 'completed') return inv.status === 'completed';
                      if (inviteFilter === 'custom') return inv.type === 'custom';
                      if (inviteFilter === 'attendee') return inv.type === 'attendee';
                      return true;
                    }).length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-8">No invites match this filter</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============== ANALYSIS VIEW ============== */}
          {activeView === 'analysis' && analysis && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">AI-Generated Analysis</h3>
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Powered by Groq</span>
                </div>
                <button
                  onClick={() => {
                    const title = 'Feedback Analysis Report';
                    const date = new Date().toLocaleDateString();
                    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333;line-height:1.7;}
h1{color:#1a365d;border-bottom:3px solid #1a365d;padding-bottom:12px;margin-bottom:8px;}
.date{color:#666;font-size:0.9rem;margin-bottom:24px;}
.content{white-space:pre-wrap;font-size:0.95rem;}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:0.8rem;color:#888;text-align:center;}
@media print{body{margin:20px;}}</style></head><body>
<h1>${title}</h1><p class="date">Generated on ${date} · ${stats?.total_responses || 0} responses analyzed</p>
<div class="content">${analysis.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
<div class="footer">Ghana Competition Law &amp; Policy Seminar 2026 — Confidential</div>
</body></html>`;
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(htmlContent);
                      printWindow.document.close();
                      setTimeout(() => printWindow.print(), 500);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-white/60 rounded-xl p-5 border border-purple-100/50">
                {analysis}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
