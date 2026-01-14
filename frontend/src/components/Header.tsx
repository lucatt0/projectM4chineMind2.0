import { Link } from 'react-router-dom';

export function Header() {
    return (
        <header className="bg-white shadow">
            <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">
                    <Link to="/">Machine Management</Link>
                </h1>
                <nav>
                    <Link to="/calendar" className="text-indigo-600 hover:text-indigo-900">
                        Maintenance Calendar
                    </Link>
                </nav>
            </div>
        </header>
    );
}
