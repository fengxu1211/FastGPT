import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ShareChatHistoryItemType,
  ShareChatType
} from '@fastgpt/global/support/outLink/api.d';
import type { ChatSiteItemType } from '@fastgpt/global/core/chat/type.d';
import { HUMAN_ICON } from '@fastgpt/global/core/chat/constants';
import { chatContentReplaceBlock } from '@fastgpt/global/core/chat/utils';

type State = {
  shareChatData: ShareChatType;
  setShareChatData: (e: ShareChatType | ((e: ShareChatType) => ShareChatType)) => void;
  shareChatHistory: ShareChatHistoryItemType[];
  saveChatResponse: (e: {
    chatId: string;
    prompts: ChatSiteItemType[];
    variables: Record<string, any>;
    shareId: string;
  }) => void;
  delOneShareHistoryByChatId: (chatId: string) => void;
  delShareChatHistoryItemById: (e: { chatId: string; contentId?: string; index: number }) => void;
  delManyShareChatHistoryByShareId: (shareId?: string) => void;
};

export const defaultHistory: ShareChatHistoryItemType = {
  chatId: `${Date.now()}`,
  updateTime: new Date(),
  title: '新对话',
  shareId: '',
  chats: []
};
const defaultShareChatData: ShareChatType = {
  userAvatar: HUMAN_ICON,
  app: {
    name: '',
    avatar: '/icon/logo.svg',
    intro: ''
  },
  history: defaultHistory
};

export const useShareChatStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => ({
        shareChatData: defaultShareChatData,
        setShareChatData(e) {
          const val = (() => {
            if (typeof e === 'function') {
              return e(get().shareChatData);
            } else {
              return e;
            }
          })();
          set((state) => {
            state.shareChatData = val;
            // update history
            state.shareChatHistory = state.shareChatHistory.map((item) =>
              item.chatId === val.history.chatId ? val.history : item
            );
          });
        },
        shareChatHistory: [],
        saveChatResponse({ chatId, prompts, variables, shareId }) {
          const chatHistory = get().shareChatHistory.find((item) => item.chatId === chatId);
          const newTitle =
            chatContentReplaceBlock(prompts[prompts.length - 2]?.value).slice(0, 20) ||
            prompts[prompts.length - 1]?.value?.slice(0, 20) ||
            'Chat';

          const historyList = (() => {
            if (chatHistory) {
              return get().shareChatHistory.map((item) =>
                item.chatId === chatId
                  ? {
                      ...item,
                      title: newTitle,
                      updateTime: new Date(),
                      chats: chatHistory.chats.concat(prompts).slice(-30),
                      variables
                    }
                  : item
              );
            }
            return get().shareChatHistory.concat({
              chatId,
              shareId,
              title: newTitle,
              updateTime: new Date(),
              chats: prompts,
              variables
            });
          })();

          // @ts-ignore
          historyList.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));

          set((state) => {
            state.shareChatHistory = historyList.slice(0, 50);
          });
        },
        delOneShareHistoryByChatId(chatId: string) {
          set((state) => {
            state.shareChatHistory = state.shareChatHistory.filter(
              (item) => item.chatId !== chatId
            );
          });
        },
        delShareChatHistoryItemById({ chatId, contentId }) {
          set((state) => {
            // update history store
            const newHistoryList = state.shareChatHistory.map((item) =>
              item.chatId === chatId
                ? {
                    ...item,
                    chats: item.chats.filter((item) => item.dataId !== contentId)
                  }
                : item
            );
            state.shareChatHistory = newHistoryList;
          });
        },
        delManyShareChatHistoryByShareId(shareId?: string) {
          set((state) => {
            if (shareId) {
              state.shareChatHistory = state.shareChatHistory.filter(
                (item) => item.shareId !== shareId
              );
            } else {
              state.shareChatHistory = [];
            }
          });
        }
      })),
      {
        name: 'shareChatStore',
        partialize: (state) => ({
          shareChatHistory: state.shareChatHistory
        })
      }
    )
  )
);
