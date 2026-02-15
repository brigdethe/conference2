import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Square, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
}

export const TodoList: React.FC = () => {
    const [todos, setTodos] = useState<Todo[]>(() => {
        const saved = localStorage.getItem('overview_todos');
        return saved ? JSON.parse(saved) : [];
    });
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        localStorage.setItem('overview_todos', JSON.stringify(todos));
    }, [todos]);

    const addTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newTodo: Todo = {
            id: Date.now().toString(),
            text: inputValue.trim(),
            completed: false,
            createdAt: Date.now()
        };

        setTodos([newTodo, ...todos]);
        setInputValue('');
    };

    const toggleTodo = (id: string) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const deleteTodo = (id: string) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-soft h-[500px] flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tasks</h2>
                    <p className="text-sm text-gray-500">Manage seminar preparations</p>
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
                    {todos.filter(t => !t.completed).length} pending
                </div>
            </div>

            <form onSubmit={addTodo} className="relative mb-6">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Add a new task..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all outline-none"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {todos.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center"
                        >
                            <Calendar className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">No tasks yet. Add one to get started!</p>
                        </motion.div>
                    ) : (
                        todos.map(todo => (
                            <motion.div
                                key={todo.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${todo.completed
                                    ? 'bg-gray-50 border-transparent'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <button
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`flex-shrink-0 transition-colors ${todo.completed ? 'text-slate-900' : 'text-gray-300 hover:text-gray-400'
                                            }`}
                                    >
                                        {todo.completed ? <Check className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                    </button>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-sm font-medium truncate transition-all ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                                            }`}>
                                            {todo.text}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {formatDate(todo.createdAt)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteTodo(todo.id)}
                                    className="p-2 text-gray-300 hover:text-slate-900 hover:bg-gray-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }
            `}</style>
        </div>
    );
};
