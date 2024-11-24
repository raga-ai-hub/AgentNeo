import os
import sys
import random
import json
from textblob import TextBlob
import openai
from dotenv import load_dotenv
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agentneo import AgentNeo, Tracer
from agentneo.data.data_models import LLMCallModel


# Initialize OpenAI API (Ensure your API key is set in your environment variables)
openai.api_key = "YOUR-OPENAI-API-KEY"

# Initialize AgentNeo session
neo_session = AgentNeo(session_name="memory_profiing_test10")
neo_session.create_project(project_name="memory_profiing_project10")
# Start tracing
tracer = Tracer(session=neo_session)
tracer.start()

# FinancialAnalysisSystem Class
class FinancialAnalysisSystem:
    def __init__(self):
        self.stock_data = {}
        self.news_sentiment = {}
        self.economic_indicators = {}

    @tracer.trace_tool(name="fetch_stock_data")
    def fetch_stock_data(self, symbol):
        return {
            "symbol": symbol,
            "price": round(random.uniform(50, 500), 2),
            "change": round(random.uniform(-5, 5), 2),
        }

    @tracer.trace_tool(name="fetch_news_articles")
    def fetch_news_articles(self, company):
        return [
            f"{company} announces new product line",
            f"{company} reports quarterly earnings",
            f"{company} faces regulatory scrutiny",
        ]

    @tracer.trace_tool(name="analyze_sentiment")
    def analyze_sentiment(self, text):
        return TextBlob(text).sentiment.polarity

    @tracer.trace_tool(name="fetch_economic_indicators")
    def fetch_economic_indicators(self):
        return {
            "gdp_growth": round(random.uniform(-2, 5), 2),
            "unemployment_rate": round(random.uniform(3, 10), 2),
            "inflation_rate": round(random.uniform(0, 5), 2),
        }

    @tracer.trace_llm(name="analyze_market_conditions")
    def analyze_market_conditions(self, stock_data, sentiment, economic_indicators):
        prompt = f"""
        Analyze the following market conditions and provide a brief market outlook:
        Stock: {stock_data['symbol']} at ${stock_data['price']} (change: {stock_data['change']}%)
        News Sentiment: {sentiment}
        Economic Indicators:
        - GDP Growth: {economic_indicators['gdp_growth']}%
        - Unemployment Rate: {economic_indicators['unemployment_rate']}%
        - Inflation Rate: {economic_indicators['inflation_rate']}%
        """
        response = openai.chat.completions.create(
            model="gpt-4-0125-preview",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
        )
        return response.choices[0].message.content.strip()

    @tracer.trace_llm(name="generate_investment_recommendation")
    def generate_investment_recommendation(self, market_outlook, risk_tolerance):
        prompt = f"""
        Based on the following market outlook and investor risk tolerance,
        provide a specific investment recommendation:
        Market Outlook: {market_outlook}
        Investor Risk Tolerance: {risk_tolerance}
        """
        response = openai.chat.completions.create(
            model="gpt-4-0125-preview",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()

    @tracer.trace_agent(name="FinancialAdvisorAgent")
    def financial_advisor_agent(self, stock_symbol, risk_tolerance):
        self.stock_data = self.fetch_stock_data(stock_symbol)
        news_articles = self.fetch_news_articles(stock_symbol)
        sentiment_scores = [self.analyze_sentiment(article) for article in news_articles]
        self.news_sentiment = sum(sentiment_scores) / len(sentiment_scores)
        self.economic_indicators = self.fetch_economic_indicators()
        market_outlook = self.analyze_market_conditions(
            self.stock_data, self.news_sentiment, self.economic_indicators
        )
        recommendation = self.generate_investment_recommendation(market_outlook, risk_tolerance)
        return recommendation

    def run_analysis(self, stock_symbol, risk_tolerance):
        recommendation = self.financial_advisor_agent(stock_symbol, risk_tolerance)
        print(f"\nAnalysis for {stock_symbol}:")
        print(f"Stock Data: {self.stock_data}")
        print(f"News Sentiment: {self.news_sentiment}")
        print(f"Economic Indicators: {self.economic_indicators}")
        print(f"\nInvestment Recommendation:\n{recommendation}")
        if "buy" in recommendation.lower():
            self.execute_buy_order(stock_symbol)
        elif "sell" in recommendation.lower():
            self.execute_sell_order(stock_symbol)
        else:
            print("No action taken based on the current recommendation.")

    @tracer.trace_tool(name="execute_buy_order")
    def execute_buy_order(self, symbol):
        print(f"Executing buy order for {symbol}")

    @tracer.trace_tool(name="execute_sell_order")
    def execute_sell_order(self, symbol):
        print(f"Executing sell order for {symbol}")

# Create an instance of FinancialAnalysisSystem
analysis_system = FinancialAnalysisSystem()

# Run an analysis for a stock with moderate risk tolerance
analysis_system.run_analysis("AAPL", "moderate")

# Stop the tracer when analysis is complete
tracer.stop()


def print_memory_profiling_data(trace_id):
    with neo_session.Session() as session:
        llm_calls = session.query(LLMCallModel).filter_by(trace_id=trace_id).all()
        for call in llm_calls:
            print(f"\nLLM Call: {call.name}")
            print(f"Memory Used: {call.memory_used} bytes")
            print(f"Peak Memory Usage: {call.peak_memory_usage} bytes")
            print("Heap Summary:")
            heap_summary = json.loads(call.heap_summary)
            for stat in heap_summary:
                print(f"  File: {stat.get('filename', 'Unknown')}:{stat.get('lineno', '')}, Size: {stat.get('size', '')} bytes, Count: {stat.get('count', '')}")
            print("Garbage Collection Summary:")
            gc_summary = json.loads(call.gc_summary)
            print(f"  Number of Collections: {gc_summary.get('num_collections', 0)}")
            for event in gc_summary.get('events', []):
                print(f"    Phase: {event.get('phase', '')}, Info: {event.get('info', '')}")
    

# Print the memory profiling data
print_memory_profiling_data(tracer.trace_id)

neo_session.launch_dashboard(port=3000)