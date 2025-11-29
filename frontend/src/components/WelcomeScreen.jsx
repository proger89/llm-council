import { Menu, Sparkles, Users, CheckCircle2 } from 'lucide-react';

function WelcomeScreen({ onNewChat, onToggleSidebar, isSidebarOpen }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-council-border">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-council-hover transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex-1" />
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-council-gpt to-council-gemini rounded-full opacity-20 blur-xl" />
              <div className="relative flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-council-gpt" />
                <div className="w-4 h-4 rounded-full bg-council-gemini" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Совет ИИ</span>
          </h1>
          
          <p className="text-xl text-council-text-secondary mb-8">
            Две модели ИИ обсуждают ваши вопросы<br />
            и приходят к единому решению
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 rounded-xl bg-council-sidebar border border-council-border">
              <div className="w-12 h-12 rounded-lg bg-council-gpt/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-council-gpt" size={24} />
              </div>
              <h3 className="font-semibold mb-2">Разные точки зрения</h3>
              <p className="text-sm text-council-text-secondary">
                GPT и Gemini дают уникальные идеи
              </p>
            </div>

            <div className="p-6 rounded-xl bg-council-sidebar border border-council-border">
              <div className="w-12 h-12 rounded-lg bg-council-gemini/20 flex items-center justify-center mx-auto mb-4">
                <Users className="text-council-gemini" size={24} />
              </div>
              <h3 className="font-semibold mb-2">Живое обсуждение</h3>
              <p className="text-sm text-council-text-secondary">
                Модели анализируют и дополняют ответы друг друга
              </p>
            </div>

            <div className="p-6 rounded-xl bg-council-sidebar border border-council-border">
              <div className="w-12 h-12 rounded-lg bg-council-claude/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-council-claude" size={24} />
              </div>
              <h3 className="font-semibold mb-2">Консенсус</h3>
              <p className="text-sm text-council-text-secondary">
                Председатель формирует итоговый ответ
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={onNewChat}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-council-gpt to-council-gemini text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Начать обсуждение
          </button>

          {/* Models */}
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-council-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-council-gpt" />
              <span>GPT-5.1 (Председатель)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-council-gemini" />
              <span>Gemini 3 Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
