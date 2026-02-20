import React from 'react';

const CodeInput: React.FC = () => {
    return (
        <div className="code-input-group">
            <input type="text" maxLength={1} className="code-input" placeholder="0" />
            <input type="text" maxLength={1} className="code-input" placeholder="0" />
            <input type="text" maxLength={1} className="code-input" placeholder="0" />
            <span className="dash">-</span>
            <input type="text" maxLength={1} className="code-input" placeholder="0" />
            <input type="text" maxLength={1} className="code-input" placeholder="0" />
            <input type="text" maxLength={1} className="code-input" placeholder="0" />
        </div>
    );
};

export default CodeInput;
