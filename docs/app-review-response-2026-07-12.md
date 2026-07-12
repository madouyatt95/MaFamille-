# App Review response - July 12, 2026

## App Review Notes

Account deletion is available directly in the app:

1. Sign in.
2. Open **Settings**.
3. Select the **Account** tab.
4. In **Account and data**, tap **Permanently delete my account**.
5. Read the consequences, enter `SUPPRIMER`, and confirm.

The account, personal data, and authentication access are permanently deleted. If the user is the only administrator of a household, that household and its owned data are also deleted. If another eligible adult administrator exists, household ownership is transferred before the user's account is deleted.

The In-App Purchase flow has also been corrected. A transaction verified by StoreKit 2 is no longer presented as failed when the household cloud synchronization is temporarily unavailable. The purchase completes in the app and the server synchronization is queued and retried automatically. Invalid, unauthorized, or mismatched transactions remain blocked.

Support information is available at:

https://myfamilyplus.fr/support

It includes a direct support contact, common questions, purchase restoration guidance, account deletion guidance, and links to the privacy policy and terms.

## Reply to App Review

Hello,

Thank you for your review and for identifying these issues. We addressed all three points in the new build:

- **Account deletion:** the permanent account deletion action is now clearly visible under Settings > Account > Account and data. The complete in-app flow requires an explicit confirmation and permanently deletes the user's account and associated personal data.
- **In-App Purchase:** the StoreKit 2 purchase flow was corrected so a temporary server synchronization failure no longer produces an Edge Function purchase error after Apple has verified the transaction. Server synchronization is retried automatically, while invalid transactions remain blocked.
- **Support URL:** a functional support page is now available at https://myfamilyplus.fr/support with a direct contact method and support information.

We have included a physical-device screen recording in App Review Information showing sign-in, navigation to the account deletion option, and the complete deletion flow through final confirmation.

Thank you.

## Physical-device recording checklist

- Show the installed build number in the recording or immediately before it.
- Create a disposable account or sign in to the review account.
- Open Settings, then Account.
- Show the visible **Account and data** section.
- Tap **Permanently delete my account**.
- Show the consequences and Apple subscription-management link.
- Enter `SUPPRIMER`.
- Confirm deletion.
- Show the success message and return to the signed-out/onboarding state.
- Upload the recording to the **Notes** field in **App Review Information** before resubmission.
