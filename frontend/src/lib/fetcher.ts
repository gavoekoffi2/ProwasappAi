"use client";

import { api } from "./api";

export const fetcher = <T,>(path: string) => api<T>(path);
