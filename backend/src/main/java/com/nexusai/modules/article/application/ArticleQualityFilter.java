package com.nexusai.modules.article.application;

import com.nexusai.modules.article.domain.Article;
import org.springframework.stereotype.Component;

@Component
public class ArticleQualityFilter {

    public boolean isDisplayable(Article article) {
        if (article == null) {
            return false;
        }

        String title = article.getTitle() == null ? "" : article.getTitle().trim().toLowerCase();
        String summary = article.getSummary() == null ? "" : article.getSummary().trim().toLowerCase();
        String fullText = article.getFullText() == null ? "" : article.getFullText().trim();

        if (title.length() < 15) {
            return false;
        }

        if (title.equals("home")
            || title.startsWith("home \\")
            || title.equals("research")
            || title.equals("news")
            || title.equals("economic futures")
            || title.contains("skip to main content")
            || title.contains("cookie policy")
            || title.contains("privacy policy")
            || title.contains("sign in")
            || title.contains("login")) {
            return false;
        }

        if (summary.length() < 40 && fullText.length() < 180) {
            return false;
        }

        String[] tokens = title.split("\\s+");
        if (tokens.length <= 2 && !title.contains("ai") && !title.contains("model") && !title.contains("llm")) {
            return false;
        }

        return true;
    }
}
