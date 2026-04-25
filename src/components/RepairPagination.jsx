import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

/**
 * Generates a smart page range array with ellipsis markers.
 * e.g., [1, '...', 4, 5, 6, '...', 10]
 */
function getPageRange(currentPage, totalPages) {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
    ) {
        range.push(i);
    }

    if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
    } else {
        rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
}

export default function RepairPagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const pages = getPageRange(currentPage, totalPages);

    const paginationBar = (
        <div className="fixed bottom-0 left-64 right-0 z-40 border-t border-slate-100 bg-white/80 backdrop-blur-md">
            <div className="flex items-center justify-between px-8 py-3">
                {/* Left: Summary */}
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
                    Page <span className="text-teal">{currentPage}</span> / {totalPages}
                </p>

                {/* Center: Page buttons */}
                <nav aria-label="Pagination" className="flex items-center gap-1 mx-auto sm:mx-0">
                    {/* Previous */}
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={cn(
                            "flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                            currentPage === 1
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-500 hover:text-teal hover:bg-teal/5 active:scale-95"
                        )}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Prev</span>
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-1">
                        {pages.map((page, idx) =>
                            page === '...' ? (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="w-9 h-9 flex items-center justify-center text-slate-300"
                                    aria-hidden
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    aria-current={currentPage === page ? 'page' : undefined}
                                    className={cn(
                                        "w-9 h-9 rounded-xl text-sm font-black transition-all duration-200 relative",
                                        currentPage === page
                                            ? "bg-teal text-white shadow-lg shadow-teal/30 scale-110"
                                            : "text-slate-500 hover:bg-teal/5 hover:text-teal active:scale-95"
                                    )}
                                >
                                    {page}
                                    {currentPage === page && (
                                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal" />
                                    )}
                                </button>
                            )
                        )}
                    </div>

                    {/* Next */}
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={cn(
                            "flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                            currentPage === totalPages
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-500 hover:text-teal hover:bg-teal/5 active:scale-95"
                        )}
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </nav>

                {/* Right: Items per page info */}
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
                    5 per page
                </p>
            </div>
        </div>
    );

    // Render using a portal so it escapes any overflow:hidden parents
    return (
        <>
            {/* Spacer so content doesn't get hidden behind the fixed bar */}
            <div className="h-16" />
            {createPortal(paginationBar, document.body)}
        </>
    );
}
