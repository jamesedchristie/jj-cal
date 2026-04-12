---
# jj-cal-1amp
title: Todo list UI & data model
status: completed
type: feature
priority: normal
created_at: 2026-04-12T06:20:09Z
updated_at: 2026-04-12T07:06:23Z
parent: jj-cal-63vm
---

Core todo CRUD: create, complete, delete, reorder. DB schema and RPC layer.

## Summary of Changes

Added full todo CRUD with optimistic updates. Schema: todosTable with completed/sort_order/created_at fields. Queries: getAllTodos, createTodo, setTodoCompleted, deleteTodo. Remote functions: getTodos (query), addTodo/toggleTodo/removeTodo (form). Migration 0004_todo_table.sql applied to local D1. UI: mobile-first tasks page with add input, circle checkboxes, completed section in details element. All mutations use optimistic local state updates to avoid query cache staleness.
