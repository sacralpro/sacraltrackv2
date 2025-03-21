import { create } from "zustand";
import { persist, devtools, createJSONStorage } from "zustand/middleware";
import useGetNewsPostById from "@/app/hooks/useGetNewsPostById";

// Define NewsItem as an interface
export interface NewsItem {
    $id: string;
    postid: string;
    img_url: string;
    name: string;
    description: string;
    author: string;
    created: string;
    likes: number;
    user_id: string;
}

interface NewsStore {
    allNews: NewsItem[];
    setAllNews: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export const useNewsStore = create<NewsStore>()(
    devtools(
        persist(
            (set) => ({
                allNews: [],
                isLoading: false,
                error: null,
                setAllNews: async () => {
                    try {
                        set({ isLoading: true, error: null });
                        const newsData = await useGetNewsPostById();
                        const formattedNewsData = Array.isArray(newsData) ? newsData : newsData ? [newsData] : [];
                        set({ allNews: formattedNewsData, isLoading: false, error: null });
                    } catch (error) {
                        set({ isLoading: false, error: error instanceof Error ? error.message : 'An error occurred' });
                    }
                },
            }),
            {
                name: "news-store",
                storage: createJSONStorage(() => localStorage),
            }
        )
    )
);

export const NewsItem = {
    // Your NewsItem properties and methods
};
