# LLM Council

<p align="center">
  <img src="frontend/public/council.svg" width="100" alt="LLM Council Logo">
</p>

**LLM Council** — веб-приложение для мультимодельных дискуссий, где AI модели обсуждают ваш вопрос и достигают консенсуса.

## Как это работает

1. **Начальные ответы**: Все модели получают запрос параллельно и отвечают независимо
2. **Обсуждение**: Модели видят анонимизированные ответы друг друга и обсуждают (до 3 раундов)
3. **Консенсус**: Председатель анализирует обсуждение и формирует итоговый ответ

## Установка

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/proger89/llm-council.git
cd llm-council
```

### 2. Настройте API ключ

Создайте файл `.env` на основе примера:

```bash
cp .env.example .env
```

Отредактируйте `.env` и добавьте ваш ключ от [OpenRouter](https://openrouter.ai/):

```env
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-здесь
```

### 3. Запустите приложение

```bash
docker-compose up --build
```

Откройте http://localhost:5173 в браузере.

## Настройка моделей

Модели настраиваются в файле `backend/config.py`:

```python
COUNCIL_MODELS = [
    {
        "id": "openai/gpt-5.1",      # ID модели в OpenRouter
        "name": "GPT-5.1",            # Отображаемое имя
        "role": "chairman",           # chairman или participant
        "color": "#10a37f"
    },
    {
        "id": "google/gemini-3-pro-preview",
        "name": "Gemini 3 Pro",
        "role": "participant",
        "color": "#4285f4"
    },
]
```

**Доступные роли:**
- `chairman` — формирует итоговый ответ (должен быть один)
- `participant` — участвует в обсуждении

**ID моделей** можно найти на [OpenRouter Models](https://openrouter.ai/models).

После изменения моделей пересоберите Docker:

```bash
docker-compose down
docker-compose up --build
```

## Лицензия

MIT
