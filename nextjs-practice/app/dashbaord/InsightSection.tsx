"use client";
import { use } from "react";

export const InsightSection = ({ insightPromise }: { insightPromise: Promise<{ title: string; description: string }> }) => {
    const insight = use(insightPromise);
    return (
        <div>
            <h2>AI Insight</h2>
            <p>Title: {insight.title}</p>
            <p>Description: {insight.description}</p>
        </div>
    );
};
