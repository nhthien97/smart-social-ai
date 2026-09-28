import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const groupService = {
    getAll() {
        return axios.get(`${API_URL}/groups`).then(res => res.data)
    },

    disableGroup(id: string) {
        return axios.patch(`${API_URL}/groups/${id}/disable`)
    }
}
