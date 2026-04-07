"""
LifeOS AI - Mood Detector
Claude-powered mood detection using OpenRouter API
"""

import os
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import httpx


@dataclass
class MoodMetrics:
    """Mood metrics returned by the detector"""
    anxiety: float      # 0-100, lower is better
    happiness: float    # 0-100, higher is better
    wellness: float     # 0-100, higher is better
    sleep: float        # 0-100, higher is better
    recovery: float     # 0-100, higher is better
    energy: Optional[float] = None  # 0-100, higher is better
    confidence: float = 0.0  # 0-1, how confident the model is
    reasoning: str = ""      # Why these values


class MoodDetector:
    """
    Detects mood metrics from conversational text using Claude via OpenRouter.
    """
    
    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    # Default model - can be overridden via constructor
    DEFAULT_MODEL = "anthropic/claude-3-haiku"
    
    SYSTEM_PROMPT = """You are an expert mood and wellness analyst. Your task is to analyze conversational text 
and extract objective mood metrics that can be tracked over time.

Analyze the text and provide scores (0-100) for these metrics:

1. **Anxiety** (0-100, LOWER is better): Stress, worry, nervousness, overthinking
2. **Happiness** (0-100, HIGHER is better): Joy, contentment, satisfaction, positivity
3. **Wellness** (0-100, HIGHER is better): Overall physical and mental wellbeing
4. **Sleep** (0-100, HIGHER is better): Quality of rest, tiredness, energy levels related to sleep
5. **Recovery** (0-100, HIGHER is better): How recovered/rested the person feels
6. **Energy** (0-100, HIGHER is better): Overall energy and vitality levels

Rules:
- Start with neutral scores of 50 if no clear signals
- Use subtle linguistic cues, emojis, and context
- Be conservative with extreme scores (rarely go below 10 or above 95)
- Consider cultural context of the speaker
- Look for negation ("not bad" = reasonably good)

Respond ONLY with valid JSON in this exact format:
{
    "anxiety": <float 0-100>,
    "happiness": <float 0-100>,
    "wellness": <float 0-100>,
    "sleep": <float 0-100>,
    "recovery": <float 0-100>,
    "energy": <float 0-100 or null>,
    "confidence": <float 0-1>,
    "reasoning": "<brief explanation>"
}"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize the mood detector.
        
        Args:
            api_key: OpenRouter API key. Defaults to OPENROUTER_API_KEY env var.
            model: Model to use. Defaults to claude-3-haiku via OpenRouter.
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenRouter API key required. Set OPENROUTER_API_KEY env var.")
        self.model = model or self.DEFAULT_MODEL
    
    async def detect(self, text: str, conversation_history: Optional[List[Dict]] = None) -> MoodMetrics:
        """
        Detect mood from conversational text.
        
        Args:
            text: The text to analyze (current message)
            conversation_history: Optional list of previous messages for context
            
        Returns:
            MoodMetrics object with all mood scores
        """
        if not text or not text.strip():
            return MoodMetrics(
                anxiety=50.0,
                happiness=50.0,
                wellness=50.0,
                sleep=50.0,
                recovery=50.0,
                confidence=0.0,
                reasoning="No text provided"
            )
        
        # Build messages
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        
        # Add conversation history for context
        if conversation_history:
            for msg in conversation_history[-5:]:  # Last 5 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if content:
                    messages.append({"role": role, "content": content})
        
        # Add current text
        messages.append({
            "role": "user", 
            "content": f"Analyze this text for mood:\n\n{text}"
        })
        
        # Call OpenRouter
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://lifeos.ai",
                        "X-Title": "LifeOS AI"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.3,  # Low temp for consistent scoring
                        "max_tokens": 500
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                # Extract content
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Parse JSON response
                metrics = self._parse_response(content)
                return metrics
                
        except httpx.HTTPStatusError as e:
            raise Exception(f"OpenRouter API error: {e.response.status_code}")
        except Exception as e:
            raise Exception(f"Mood detection failed: {str(e)}")
    
    def _parse_response(self, content: str) -> MoodMetrics:
        """Parse the JSON response from the model."""
        try:
            # Try to extract JSON from the response
            json_str = content
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0]
            elif content.startswith("{"):
                json_str = content
            
            data = json.loads(json_str.strip())
            
            return MoodMetrics(
                anxiety=float(data.get("anxiety", 50.0)),
                happiness=float(data.get("happiness", 50.0)),
                wellness=float(data.get("wellness", 50.0)),
                sleep=float(data.get("sleep", 50.0)),
                recovery=float(data.get("recovery", 50.0)),
                energy=float(data.get("energy")) if data.get("energy") else None,
                confidence=float(data.get("confidence", 0.5)),
                reasoning=data.get("reasoning", "")
            )
        except json.JSONDecodeError:
            # Fallback: return neutral scores
            return MoodMetrics(
                anxiety=50.0,
                happiness=50.0,
                wellness=50.0,
                sleep=50.0,
                recovery=50.0,
                confidence=0.0,
                reasoning="Failed to parse model response"
            )
    
    def detect_sync(self, text: str, conversation_history: Optional[List[Dict]] = None) -> MoodMetrics:
        """
        Synchronous version of detect for non-async contexts.
        """
        import asyncio
        return asyncio.run(self.detect(text, conversation_history))


# Convenience function
def detect_mood(text: str, api_key: Optional[str] = None) -> MoodMetrics:
    """
    Quick mood detection function.
    
    Args:
        text: Text to analyze
        api_key: Optional API key override
        
    Returns:
        MoodMetrics object
    """
    detector = MoodDetector(api_key=api_key)
    return detector.detect_sync(text)
