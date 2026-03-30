/**
 * ProfilePage - Redirect stub
 *
 * The monolithic ProfilePage has been split into 4 standalone pages:
 *   /my-basics        → MyBasicsPage (About, Contact, Social, Privacy)
 *   /my-professional  → MyProfessionalPage (Professional, Skills, Data)
 *   /my-engagement    → MyEngagementPage (My Status, Interests, Looking For)
 *   /my-account       → MyAccountPage (Membership, My Payments)
 *
 * This file remains so that any existing /profile links redirect gracefully.
 */

import { Navigate } from 'react-router';

export default function ProfilePage() {
  return <Navigate to="/my-basics" replace />;
}
