import StatCard from "./StatCard"

export default function StatsGrid() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Users" value="1,245" />
            <StatCard title="Posts" value="8,430" />
            <StatCard title="Reports" value="32" />
            <StatCard title="Groups" value="120" />
        </div>
    )
}