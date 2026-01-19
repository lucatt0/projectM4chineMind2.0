import { NavLink } from 'react-router-dom';

const navigation = [
    { name: 'Machines', href: '/', icon: 'M' },
    { name: 'Stock', href: '/stock', icon: 'S' },
    { name: 'Operators', href: '/operators', icon: 'O' },
    { name: 'Maintenance', href: '/maintenance', icon: 'C' },
    { name: 'Reports', href: '/reports', icon: 'R' },
]

function Sidebar() {
    return (
        <div className="flex flex-col w-64 bg-gray-800">
            <div className="flex items-center justify-center h-16 bg-gray-900">
                <h1 className="text-2xl font-bold text-white">MachineMind</h1>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/'} // Important for matching the root URL exactly
                        className={({ isActive }) =>
                            `flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`
                        }
                    >
                        <span className="w-6 h-6 mr-3 text-center">{item.icon}</span>
                        {item.name}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}

export default Sidebar;