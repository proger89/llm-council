import { memo, useMemo, useCallback } from 'react';
import { Loader2, CheckCircle, Circle } from 'lucide-react';

// Static stages definition - outside component to avoid recreation
const STAGES = [
  { id: 'initial', label: 'Начальные ответы', description: 'Получаем мнения от всех моделей' },
  { id: 'discussion', label: 'Обсуждение', description: 'Модели анализируют ответы друг друга' },
  { id: 'consensus', label: 'Консенсус', description: 'Председатель формирует итоговый ответ' },
];

const STAGE_ORDER = ['initial', 'discussion', 'consensus'];

const MODELS = [
  { name: 'GPT-5.1', key: 'gpt', color: 'bg-council-gpt' },
  { name: 'Gemini 3', key: 'gemini', color: 'bg-council-gemini' }
];

const ProgressIndicator = memo(function ProgressIndicator({ discussionState }) {
  const { stage, progress } = discussionState || {};

  const getStageStatus = useCallback((stageId) => {
    const currentIndex = STAGE_ORDER.indexOf(stage);
    const targetIndex = STAGE_ORDER.indexOf(stageId);

    if (currentIndex > targetIndex) return 'completed';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  }, [stage]);

  const getModelProgress = useCallback((stageId) => {
    if (!progress) return [];
    return progress.filter(p => p.stage === stageId && p.status === 'completed');
  }, [progress]);

  return (
    <div className="ml-11 p-4 rounded-xl bg-council-sidebar border border-council-border">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 size={18} className="animate-spin text-council-accent" />
        <span className="font-medium">Совет обсуждает...</span>
      </div>

      <div className="space-y-4">
        {STAGES.map((s, index) => {
          const status = getStageStatus(s.id);
          const modelProgress = getModelProgress(s.id);

          return (
            <div key={s.id} className="flex gap-3">
              {/* Status icon */}
              <div className="flex flex-col items-center">
                {status === 'completed' ? (
                  <CheckCircle size={20} className="text-council-accent" />
                ) : status === 'active' ? (
                  <div className="relative">
                    <Circle size={20} className="text-council-accent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-council-accent animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <Circle size={20} className="text-council-text-secondary" />
                )}
                {index < STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-1 ${
                    status === 'completed' ? 'bg-council-accent' : 'bg-council-border'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <p className={`font-medium text-sm ${
                  status === 'active' ? 'text-council-accent' : 
                  status === 'completed' ? 'text-council-text' : 'text-council-text-secondary'
                }`}>
                  {s.label}
                </p>
                <p className="text-xs text-council-text-secondary mt-0.5">
                  {s.description}
                </p>

                {/* Model progress indicators */}
                {status === 'active' && (
                  <div className="flex gap-2 mt-2">
                    {MODELS.map((model) => {
                      const isComplete = modelProgress.some(
                        p => p.model_name?.toLowerCase().includes(model.key)
                      );
                      return (
                        <div
                          key={model.name}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            isComplete 
                              ? 'bg-council-accent/20 text-council-accent' 
                              : 'bg-council-hover text-council-text-secondary'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${model.color}`} />
                          {model.name}
                          {isComplete && <CheckCircle size={10} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ProgressIndicator;
