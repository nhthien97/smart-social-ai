type Props = {
    title: string
    value: string
}

export default function StatCard({ title, value }: Props) {
    return (
        <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
                {value}
            </p>
        </div>
    )
}