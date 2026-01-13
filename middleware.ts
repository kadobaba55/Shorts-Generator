import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized({ req, token }) {
            // Protect /config and /editor routes
            const path = req.nextUrl.pathname
            if (path.startsWith("/admin") || path.startsWith("/profile")) {
                return !!token
            }
            return true
        },
    },
})

export const config = {
    matcher: ["/admin/:path*", "/profile/:path*"],
}
