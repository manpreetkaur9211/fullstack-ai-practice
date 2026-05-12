"use client";
import { fetchAIInsight } from "@/lib/data";
import { startTransition, use, useState } from "react";
import { AIInsight as AIInsightType } from "@/lib/types";
export const AIInsight = ({ aiInsightPromise }: { aiInsightPromise: Promise<AIInsightType> }) => {
    const [newInsightPromise, setNewInsightPromise] = useState(aiInsightPromise); // This will throw a promise if it's still pending, or an error if it failed   
    const aiInsight = use(newInsightPromise); // This will throw a promise if it's still pending, or an error if it failed
    return (
        <div className="p-4 bg-gray-100 rounded-md">    
            <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Insight</h3>
             <button 
                onClick={
                    () => startTransition(() => {
                      const insight =  fetchAIInsight();  
                      setNewInsightPromise(insight);                
                    })
                }
                className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    Refresh Insight
                </button>
            {aiInsight?.content && <p className="text-gray-700">{aiInsight.content} (Attempt: {aiInsight.attempt?.toFixed(2)})</p>}
        </div>
    );
}