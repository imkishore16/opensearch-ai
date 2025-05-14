/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useRef, useState, FormEvent } from 'react';
import Blobs from './Blobs';
import Globe from './Globe';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import mem0Logo from './assets/logo.png';
import { Session } from 'next-auth';
import { signIn } from 'next-auth/react';
import {
  createCustomMemory,
  deleteMemory,
  getMem0Memories,
  getSearchResultsFromMemory,
} from "./actions";
import { BraveResults, SearchHistory, SearchFilters, Bookmark, Result } from "./types";
import { useChat } from "ai/react";
import Markdown from "react-markdown";
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza";
import { useSearchParams } from "next/navigation";
import WebReferences from "@/components/web-references";

function ChatPage({ user }: { user: Session | null }) {
  const [searchResultsData, setSearchResultsData] =
    useState<BraveResults | null>(null);

  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    append,
    setInput,
  } = useChat();

  const [customUserMemory, setCustomUserMemory] = useState<string | null>(null);

  const [userMemories, setUserMemories] = useState<
    { memory: string; id: string }[]
  >([]);

  // Add new state variables
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Handling Memory Submit
  const handleMemorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customUserMemory) return;
    try {
      const memory = await createCustomMemory(customUserMemory, user);
      // @ts-ignore
      setUserMemories([...userMemories, memory]);
    } catch (error) {
      console.error('Error creating memory:', error);
    }
  };

  const addToSearchHistory = (query: string) => {
    const newHistory: SearchHistory = {
      id: Math.random().toString(36).substring(7),
      query,
      timestamp: new Date().toISOString(),
      userId: user?.user?.email || 'anonymous'
    };
    setSearchHistory([newHistory, ...searchHistory].slice(0, 10)); // Keep last 10 searches
  };

  const addBookmark = (result: Result) => {
    const newBookmark: Bookmark = {
      id: Math.random().toString(36).substring(7),
      url: result.url,
      title: result.title,
      description: result.description,
      timestamp: new Date().toISOString(),
      userId: user?.user?.email || 'anonymous',
      tags: []
    };
    setBookmarks([newBookmark, ...bookmarks]);
  };

  const fetchSearch = async (
    query: string,
    e?: React.FormEvent<HTMLElement> | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    e?.preventDefault();
    e?.type === "keydown" && e.stopPropagation();

    addToSearchHistory(query);
    const data = await getSearchResultsFromMemory(query, user);
    if (!data) return;

    setSearchResultsData(data);

    if (!e) {
      append({
        role: "user",
        content: query,
      }, {
        body: {
          data,
          input: query
        }
      })
    }

    handleSubmit(e, { body: { data, input: query } });

    return data;
  };

  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      if (initialQuery) {
        setInput(initialQuery);
        fetchSearch(initialQuery);
      }
    }
  }, [initialQuery]);

  const router = useRouter()

  return (
    <div className="relative h-screen">
      <div className="absolute flex max-h-screen h-full overflow-hidden items-center justify-center w-full -z-10 blur-xl">
        <Blobs />
      </div>
      {!searchResultsData && (
        <div className="absolute flex min-h-screen items-start justify-center w-full -z-10">
          <Globe />
        </div>
      )}

      <main className="min-h-screen flex flex-col items-center justify-between p-4 md:p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
          <div className="flex flex-col gap-4 w-full lg:flex-row lg:items-center lg:justify-between">
            

            {user?.user && (
              <Credenza>
                <CredenzaTrigger asChild>
                  <button
                    onClick={async () => {
                      const mems = await getMem0Memories(user);
                      setUserMemories(mems ?? []);
                    }}
                    className="p-4 w-full text-left lg:w-auto"
                  >
                    Saved memories
                  </button>
                </CredenzaTrigger>
                <CredenzaContent>
                  <CredenzaHeader>
                    <CredenzaTitle className="text-lg font-bold">
                      Your Memories
                    </CredenzaTitle>
                    <CredenzaDescription>
                      Information automatically collected about you by mem0.ai
                    </CredenzaDescription>
                  </CredenzaHeader>
                  <CredenzaBody>
                    <ul className="list-disc max-h-96 overflow-y-auto flex flex-col gap-2">
                      {userMemories.length === 0 && (
                        <li>
                          Nothing here... Yet! Just start browsing and asking
                          questions. I&apos;ll remember it.
                        </li>
                      )}
                      {userMemories.map((memory) => (
                        <li
                          key={memory.id}
                          className="text-sm border rounded-md p-2 flex gap-2 justify-between"
                        >
                          <span>{memory.memory}</span>
                          <button
                            onClick={async () => deleteMemory(memory.id, user)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="size-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                      <form
                        onSubmit={handleMemorySubmit}
                        className="flex justify-between items-center gap-2"
                      >
                        <input
                          value={customUserMemory ?? ''}
                          onChange={(e) => setCustomUserMemory(e.target.value)}
                          className="rounded-md border p-2 w-full"
                          placeholder="Type something here to add it to memory"
                        />
                        <button
                          className="p-2 rounded-md bg-black text-white"
                          type="submit"
                        >
                          Add
                        </button>
                      </form>
                    </ul>
                  </CredenzaBody>
                </CredenzaContent>
              </Credenza>
            )}
          </div>

          {searchResultsData && (
            <button
              onClick={() => {
                router.push('/');
              }}
            >
              Home
            </button>
          )}

          {!searchResultsData && (
            <div className="fixed bottom-0 left-0 flex flex-col gap-4 h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
              {/*  */}
            </div>
          )}
        </div>

        {searchResultsData ? (
          <div className="flex flex-col gap-4 items-start max-w-3xl w-full mt-32 md:mt-8">
            {/* Add search form at the top */}
            {user && user.user && (
              <form
                id="search-form"
                onSubmit={async (e) => {
                  await fetchSearch(input, e);
                }}
                className="flex flex-col gap-4 w-full max-w-xl"
              >
                {/* Search History Dropdown */}
                {searchHistory.length > 0 && (
                  <div className="relative w-full">
                    <div className="absolute top-full left-0 w-full bg-white rounded-md shadow-lg z-10 mt-1">
                      {searchHistory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setInput(item.query);
                            fetchSearch(item.query);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center"
                        >
                          <span>{item.query}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Filters */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>

                {showFilters && (
                  <div className="flex gap-4 p-4 bg-white rounded-md shadow-sm">
                    <select
                      value={filters.dateRange || ''}
                      onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as SearchFilters['dateRange'] })}
                      className="p-2 border rounded"
                    >
                      <option value="">Any time</option>
                      <option value="day">Past 24 hours</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                      <option value="year">Past year</option>
                    </select>

                    <select
                      value={filters.sourceType || ''}
                      onChange={(e) => setFilters({ ...filters, sourceType: e.target.value as SearchFilters['sourceType'] })}
                      className="p-2 border rounded"
                    >
                      <option value="">All sources</option>
                      <option value="news">News</option>
                      <option value="article">Articles</option>
                      <option value="code">Code</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                )}

                {/* Existing search input */}
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    name="query"
                    cols={2}
                    placeholder="What are you looking for?"
                    className="rounded-xl font-sans max-w-xl w-full border border-blue-500/50 p-4 bg-white bg-opacity-30 backdrop-blur-xl min-h-20"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        await fetchSearch(input, e);
                      }
                    }}
                  />

                  <button
                    type="submit"
                    className="absolute top-4 right-4 rounded-lg bg-black text-white p-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
              </form>
            )}
            
            {messages.map((message, i) => (
              <div key={`message-${i}`} className="w-full max-w-3xl flex flex-col gap-2">
                {message.role === 'user' ? (
                  <div className="flex gap-4 font-bold text-2xl">
                    <img
                      src={user?.user?.image ?? '/user-placeholder.svg'}
                      className="rounded-full w-10 h-10 border-2 border-primary-foreground"
                      alt="User profile picture"
                    />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div>
                    <WebReferences searchResults={searchResultsData} />
                    <div className="prose lg:prose-xl" key={message.id}>
                      <Markdown>{message.content}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full items-center justify-center">
            <div className="text-4xl md:text-6xl mt-20">Open Search GPT</div>

            {user && user.user ? (
              <form
                id="search-form"
                onSubmit={async (e) => {
                  await fetchSearch(input, e);
                }}
                className="flex flex-col gap-4 w-full max-w-xl"
              >
                {/* Search History Dropdown */}
                {searchHistory.length > 0 && (
                  <div className="relative w-full">
                    <div className="absolute top-full left-0 w-full bg-white rounded-md shadow-lg z-10 mt-1">
                      {searchHistory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setInput(item.query);
                            fetchSearch(item.query);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center"
                        >
                          <span>{item.query}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Filters */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>

                {showFilters && (
                  <div className="flex gap-4 p-4 bg-white rounded-md shadow-sm">
                    <select
                      value={filters.dateRange || ''}
                      onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as SearchFilters['dateRange'] })}
                      className="p-2 border rounded"
                    >
                      <option value="">Any time</option>
                      <option value="day">Past 24 hours</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                      <option value="year">Past year</option>
                    </select>

                    <select
                      value={filters.sourceType || ''}
                      onChange={(e) => setFilters({ ...filters, sourceType: e.target.value as SearchFilters['sourceType'] })}
                      className="p-2 border rounded"
                    >
                      <option value="">All sources</option>
                      <option value="news">News</option>
                      <option value="article">Articles</option>
                      <option value="code">Code</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                )}

                {/* Existing search input */}
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={handleInputChange}
                    name="query"
                    cols={2}
                    placeholder="What are you looking for?"
                    className="rounded-xl font-sans max-w-xl w-full border border-blue-500/50 p-4 bg-white bg-opacity-30 backdrop-blur-xl min-h-20"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        await fetchSearch(input, e);
                      }
                    }}
                  />

                  <button
                    type="submit"
                    className="absolute top-4 right-4 rounded-lg bg-black text-white p-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-4 py-2 rounded-full bg-black text-white flex gap-2 justify-between items-center"
              >
                <img
                  src={'./google.png'}
                  width={20}
                  height={20}
                  alt="google logo"
                />
                <p className="text-center mt-1">Sign in with Google</p>
              </button>
            )}
          </div>
        )}

        {/* Add bookmark buttons to search results */}
        {searchResultsData && (
          <div className="flex flex-col gap-4 items-start max-w-3xl w-full mt-4">
            {searchResultsData.web.results.map((result) => (
              <div key={result.url} className="flex justify-between items-start w-full">
                <div>
                  <h3 className="text-xl font-bold">{result.title}</h3>
                  <p>{result.description}</p>
                </div>
                <button
                  onClick={() => addBookmark(result)}
                  className="p-2 text-gray-600 hover:text-gray-800"
                  title="Bookmark this result"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left"></div>
      </main>
    </div>
  );
}

export default ChatPage;
