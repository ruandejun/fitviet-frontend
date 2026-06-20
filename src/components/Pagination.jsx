import React from 'react';

export default function Pagination({ page, count, pageSize, onPageChange }) {
    const totalPages = Math.ceil(count / pageSize) || 1;
    const prevDisabled = page <= 1;
    const nextDisabled = page >= totalPages;

    const fromVal = count === 0 ? 0 : (page - 1) * pageSize + 1;
    const toVal = Math.min(page * pageSize, count);
    const infoText = `Hiển thị ${fromVal} - ${toVal} của ${count}`;

    // Generate page items
    const getPageNumbers = () => {
        const pages = [];
        
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show page 1
            pages.push(1);
            
            if (page > 4) {
                pages.push('...');
            }
            
            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (page < totalPages - 3) {
                pages.push('...');
            }
            
            // Always show last page
            pages.push(totalPages);
        }
        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="pagination">
            <span>{infoText}</span>
            <div className="pag-btns">
                <button 
                    className="pag-btn" 
                    onClick={() => onPageChange(page - 1)} 
                    disabled={prevDisabled}
                    title="Trang trước"
                >
                    Trước
                </button>
                
                {pageNumbers.map((p, idx) => {
                    if (p === '...') {
                        return <span key={`ellipsis-${idx}`} className="pag-ellipsis">...</span>;
                    }
                    return (
                        <button
                            key={`page-${p}`}
                            className={`pag-btn ${page === p ? 'active' : ''}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
                        </button>
                    );
                })}

                <button 
                    className="pag-btn" 
                    onClick={() => onPageChange(page + 1)} 
                    disabled={nextDisabled}
                    title="Trang sau"
                >
                    Sau
                </button>
            </div>
        </div>
    );
}
