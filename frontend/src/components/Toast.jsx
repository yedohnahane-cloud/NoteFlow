import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

let toastTrigger = null;

export function showToast(message, type = "success", duration = 3500) {
    if (toastTrigger) {
        toastTrigger(message, type, duration);
    }
}

export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        toastTrigger = (message, type, duration) => {
            const id = Date.now() + Math.random();
            setToasts(prev => [...prev, { id, message, type }]);

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        };

        return () => {
            toastTrigger = null;
        };
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast-item toast-${toast.type}`}>
                    <div className="toast-icon">
                        {toast.type === "success" && <CheckCircle2 size={18} />}
                        {toast.type === "error" && <AlertCircle size={18} />}
                        {toast.type === "info" && <Info size={18} />}
                    </div>
                    <span className="toast-text">{toast.message}</span>
                    <button 
                        type="button" 
                        className="toast-close" 
                        onClick={() => removeToast(toast.id)}
                        aria-label="Fermer"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
