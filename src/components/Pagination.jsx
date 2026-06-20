import React from 'react';

export default function Pagination({ infoText, onPrev, onNext, prevDisabled, nextDisabled }) {
    return (
        <div className="pagination">
            <span>{infoText}</span>
            <div className="pag-btns">
                <button className="btn btn-secondary" onClick={onPrev} disabled={prevDisabled}>Trước</button>
                <button className="btn btn-secondary" onClick={onNext} disabled={nextDisabled}>Sau</button>
            </div>
        </div>
    );
}
