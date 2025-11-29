import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function DiscussionPanel({ discussionData, isLive = false }) {
  const [activeTab, setActiveTab] = useState('initial');
  const [expandedResponse, setExpandedResponse] = useState(null);

  const { initial_responses, discussion_rounds, consensus } = discussionData || {};

  const tabs = [
    { id: 'initial', label: 'Начальные ответы', count: initial_responses?.length || 0 },
    { id: 'discussion', label: 'Обсуждение', count: discussion_rounds?.length || 0 },
    { id: 'consensus', label: 'Консенсус', show: !!consensus },
  ].filter(tab => tab.show !== false);

  const getModelColor = (modelName) => {
    if (modelName?.toLowerCase().includes('gpt')) return 'bg-council-gpt';
    if (modelName?.toLowerCase().includes('gemini')) return 'bg-council-gemini';
    if (modelName?.toLowerCase().includes('claude') || modelName?.toLowerCase().includes('opus')) return 'bg-council-claude';
    return 'bg-council-text-secondary';
  };

  const getModelBorderColor = (modelName) => {
    if (modelName?.toLowerCase().includes('gpt')) return 'border-council-gpt/30';
    if (modelName?.toLowerCase().includes('gemini')) return 'border-council-gemini/30';
    if (modelName?.toLowerCase().includes('claude') || modelName?.toLowerCase().includes('opus')) return 'border-council-claude/30';
    return 'border-council-border';
  };

  return (
    <div className="mt-4 ml-11 rounded-xl bg-council-sidebar border border-council-border overflow-hidden animate-slide-up">
      {/* Tabs */}
      <div className="flex border-b border-council-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-council-accent'
                : 'text-council-text-secondary hover:text-council-text'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-council-accent/20' 
                    : 'bg-council-hover'
                }`}>
                  {tab.count}
                </span>
              )}
              {isLive && tab.id === activeTab && (
                <span className="w-2 h-2 rounded-full bg-council-accent animate-pulse" />
              )}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-council-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Initial Responses */}
        {activeTab === 'initial' && initial_responses && (
          <div className="space-y-3">
            {initial_responses.map((response, index) => (
              <div
                key={index}
                className={`rounded-lg border ${getModelBorderColor(response.model_name)} overflow-hidden`}
              >
                <button
                  onClick={() => setExpandedResponse(
                    expandedResponse === `initial-${index}` ? null : `initial-${index}`
                  )}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-council-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getModelColor(response.model_name)}`} />
                    <span className="font-medium text-sm">{response.model_name}</span>
                    {response.confidence && (
                      <span className="text-xs text-council-text-secondary">
                        уверенность {Math.round(response.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  {expandedResponse === `initial-${index}` ? (
                    <ChevronDown size={16} className="text-council-text-secondary" />
                  ) : (
                    <ChevronRight size={16} className="text-council-text-secondary" />
                  )}
                </button>
                {expandedResponse === `initial-${index}` && (
                  <div className="px-4 pb-4 border-t border-council-border/50">
                    <div className="pt-3 text-sm markdown-content">
                      <ReactMarkdown>{response.content}</ReactMarkdown>
                    </div>
                    {response.key_points?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-council-border/50">
                        <p className="text-xs text-council-text-secondary mb-2">Ключевые моменты:</p>
                        <ul className="text-xs space-y-1">
                          {response.key_points.map((point, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-council-accent">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Discussion Rounds */}
        {activeTab === 'discussion' && discussion_rounds && (
          <div className="space-y-6">
            {discussion_rounds.map((round, roundIndex) => (
              <div key={roundIndex}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} className="text-council-text-secondary" />
                  <span className="text-sm font-medium text-council-text-secondary">
                    Раунд {round.round_number}
                  </span>
                </div>
                <div className="space-y-3">
                  {round.responses?.map((response, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border ${getModelBorderColor(response.model_name)} overflow-hidden`}
                    >
                      <button
                        onClick={() => setExpandedResponse(
                          expandedResponse === `round-${roundIndex}-${index}` 
                            ? null 
                            : `round-${roundIndex}-${index}`
                        )}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-council-hover/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getModelColor(response.model_name)}`} />
                          <span className="font-medium text-sm">{response.model_name}</span>
                        </div>
                        {expandedResponse === `round-${roundIndex}-${index}` ? (
                          <ChevronDown size={16} className="text-council-text-secondary" />
                        ) : (
                          <ChevronRight size={16} className="text-council-text-secondary" />
                        )}
                      </button>
                      {expandedResponse === `round-${roundIndex}-${index}` && (
                        <div className="px-4 pb-4 border-t border-council-border/50">
                          <div className="pt-3 text-sm markdown-content">
                            <ReactMarkdown>{response.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {discussion_rounds.length === 0 && (
              <p className="text-sm text-council-text-secondary text-center py-4">
                Раунды обсуждения появятся здесь...
              </p>
            )}
          </div>
        )}

        {/* Consensus */}
        {activeTab === 'consensus' && consensus && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-council-accent">
              <CheckCircle size={18} />
              <span className="font-medium">
                {consensus.consensus_reached ? 'Консенсус достигнут' : 'Частичный консенсус'}
              </span>
            </div>

            {consensus.summary && (
              <div className="p-3 rounded-lg bg-council-hover/50">
                <p className="text-sm text-council-text-secondary mb-1">Резюме</p>
                <p className="text-sm">{consensus.summary}</p>
              </div>
            )}

            {consensus.key_agreements?.length > 0 && (
              <div>
                <p className="text-sm text-council-text-secondary mb-2">Точки согласия</p>
                <ul className="space-y-1">
                  {consensus.key_agreements.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {consensus.key_disagreements?.length > 0 && (
              <div>
                <p className="text-sm text-council-text-secondary mb-2">Оставшиеся разногласия</p>
                <ul className="space-y-1">
                  {consensus.key_disagreements.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-500">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscussionPanel;
