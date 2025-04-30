// js/views/messageViews.js
import * as store from '../store.js';
import * as auth from '../auth.js';
import { t, getCurrentLanguage } from '../i18n.js';
import { render, toggleAdminSidebar, renderTemporaryMessage, formatDateTime, renderNavbar } from './common.js';

// --- Inbox View ---
export function renderMessagesPage() {
    console.log("[renderMessagesPage] Function START");
    try {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) { console.log("[renderMessagesPage] User not logged in, redirecting."); window.location.hash = '#login'; return; }
        toggleAdminSidebar(false); // Hide admin sidebar
        const adminIds = store.getAdminUserIds();
        const allMessages = store.getMessages();
        console.log(`[renderMessagesPage] Fetched ${allMessages.length} total messages.`);
        let conversations = {};

        // Group messages by conversation partner
        allMessages.forEach(msg => {
            let partnerId = null;
            let isSupport = false;
            if (msg.senderId === currentUser.id) { // Message sent by current user
                if (adminIds.includes(msg.recipientId)) { partnerId = 'support_admin'; isSupport = true; }
                else { partnerId = msg.recipientId; }
            } else if (msg.recipientId === currentUser.id) { // Message received by current user
                if (adminIds.includes(msg.senderId)) { partnerId = 'support_admin'; isSupport = true; }
                else { partnerId = msg.senderId; }
            }
            // Store the latest message for each partner
            if (partnerId) { if (!conversations[partnerId] || new Date(msg.timestamp) > new Date(conversations[partnerId].timestamp)) { conversations[partnerId] = { ...msg, isSupport: isSupport }; } }
        });
        console.log(`[renderMessagesPage] Processed into ${Object.keys(conversations).length} conversations.`);

        // Sort conversations by last message time (newest first)
        let threadsHtml = Object.entries(conversations)
            .sort(([, a], [, b]) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(([partnerId, lastMsg]) => {
                let partnerName = t('supportTeam', {}, 'Support Team');
                let conversationLink = '#support-chat';
                let unreadCount = 0;
                if (!lastMsg.isSupport) { // Regular user chat
                    const partnerUser = store.findUserById(partnerId);
                    partnerName = partnerUser ? partnerUser.username : t('unknownUser', {}, 'Unknown User');
                    conversationLink = `#conversation/${partnerId}`;
                    unreadCount = store.getMessagesForConversation(currentUser.id, partnerId).filter(m => m.recipientId === currentUser.id && !m.read).length;
                } else { // Support chat
                    unreadCount = store.getSupportMessages(currentUser.id).filter(m => m.recipientId === currentUser.id && !m.read).length;
                }
                const formattedTime = formatDateTime(lastMsg.timestamp);
                const snippet = lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
                const isSender = lastMsg.senderId === currentUser.id;

                return `
                <a href="${conversationLink}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${unreadCount > 0 ? 'list-group-item-primary fw-bold' : ''}">
                    <div>
                         <h6 class="mb-1">${partnerName}</h6>
                         <small class="text-muted">${isSender ? t('youPrefix', {}, 'You') + ': ' : ''}${snippet}</small>
                     </div>
                     <div class="text-end flex-shrink-0 ms-3">
                         <small class="text-muted d-block mb-1">${formattedTime}</small>
                         ${unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
                     </div>
                 </a>`;
            }).join('');

        if (Object.keys(conversations).length === 0) { threadsHtml = `<li class="list-group-item text-center text-muted p-4">${t('noMessagesYet', {}, 'No messages yet.')}</li>`; }

        // Add support button for non-admins
        let supportButtonHtml = '';
        if (currentUser.role !== 'admin') { supportButtonHtml = `<a href="#support-chat" class="btn btn-info mt-3"><i class="bi bi-headset"></i> ${t('contactSupportButton', {}, 'Contact Support')}</a>`; }

        const contentHtml = `
            <div data-page-title-key="navMessages"></div>
            <h2 class="mb-4"><i class="bi bi-chat-dots-fill me-2"></i>${t('navMessages', {}, 'Messages')}</h2>
            <div class="list-group shadow-sm">
                 ${threadsHtml}
             </div>
             <div class="mt-4">
                ${supportButtonHtml}
             </div>`;

        console.log("[renderMessagesPage] Calling render()...");
        render(contentHtml, false, true); // Not admin-specific, add container
        console.log("[renderMessagesPage] render() called.");

    } catch (e) {
        console.error("Error rendering messages page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
     console.log("[renderMessagesPage] Function END");
}

// --- Conversation View ---
export function renderConversationPage() {
    console.log("[renderConversationPage] Function START");
    try {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) { console.log("[renderConversationPage] User not logged in, redirecting."); window.location.hash = '#login'; return; }
        toggleAdminSidebar(false);

        const hashParts = window.location.hash.split('/');
        const partnerId = hashParts[0] === '#support-chat' ? 'support-chat' : hashParts[1];
        console.log(`[renderConversationPage] Partner ID derived from hash: ${partnerId}`);

        let conversationMessages = [];
        let partnerName = '';
        let isSupportChat = partnerId === 'support-chat';
        let otherUserId = null; // Actual user ID of the partner if not support chat
        let recipientForSend = null; // ID to use when sending a message

        // Determine partner details and fetch messages
        if (isSupportChat) {
            partnerName = t('supportTeam', {}, 'Support Team');
            conversationMessages = store.getSupportMessages(currentUser.id);
            store.markSupportMessagesAsRead(currentUser.id); // Mark as read
            const adminIds = store.getAdminUserIds();
             if (currentUser.role !== 'admin') {
                 recipientForSend = adminIds.length > 0 ? adminIds[0] : null;
                 if (!recipientForSend) console.error("[renderConversationPage] Cannot send support message, no admin users found in store.");
             } else {
                const nonAdminParticipant = conversationMessages.find(m => !adminIds.includes(m.senderId) || !adminIds.includes(m.recipientId));
                recipientForSend = nonAdminParticipant ? (nonAdminParticipant.senderId === currentUser.id ? nonAdminParticipant.recipientId : nonAdminParticipant.senderId) : null;
                 if (!recipientForSend) console.log("[renderConversationPage] Admin viewing support chat, but couldn't determine non-admin participant to reply to.");
             }
        } else {
            otherUserId = partnerId;
            const partnerUser = store.findUserById(otherUserId);
            if (!partnerUser) {
                console.warn(`[renderConversationPage] Partner user with ID ${otherUserId} not found. Redirecting.`);
                renderTemporaryMessage('alertTempUserNotFound', 'warning');
                setTimeout(() => window.location.hash = '#messages', 1500);
                return;
            }
            partnerName = partnerUser.username;
            conversationMessages = store.getMessagesForConversation(currentUser.id, otherUserId);
            store.markMessagesAsRead(currentUser.id, otherUserId); // Mark as read
            recipientForSend = otherUserId;
        }
         console.log(`[renderConversationPage] Partner Name: ${partnerName}, Is Support: ${isSupportChat}, Recipient for Send: ${recipientForSend}`);
         console.log(`[renderConversationPage] Fetched ${conversationMessages.length} messages.`);


        // --- Build HTML ---
        renderNavbar(); // Refresh navbar

        let messagesHtml = conversationMessages.map(msg => {
            const isSender = msg.senderId === currentUser.id;
            let senderName = t('unknownUser');
            if (isSender) {
                senderName = t('youPrefix', {}, 'You');
            } else {
                if (isSupportChat && store.getAdminUserIds().includes(msg.senderId)) {
                     senderName = t('supportTeam', {}, 'Support');
                } else {
                    const senderUser = store.findUserById(msg.senderId);
                    senderName = senderUser ? senderUser.username : t('unknownUser');
                }
            }
            const bubbleClass = isSender ? 'bg-primary text-white' : 'bg-light text-dark';
            const time = new Date(msg.timestamp).toLocaleTimeString(getCurrentLanguage(), { hour: 'numeric', minute: '2-digit' });
            return `
            <div class="d-flex ${isSender ? 'justify-content-end' : 'justify-content-start'} my-2">
                 <div class="message-bubble d-inline-block" style="max-width: 75%;">
                     <div class="${bubbleClass} p-2 px-3 rounded mb-1 shadow-sm">
                         ${msg.content.replace(/\n/g, '<br>')}
                     </div>
                     <small class="text-muted d-block ${isSender ? 'text-end' : 'text-start'}" style="font-size: 0.75rem;">
                         ${!isSender ? senderName + ' - ' : ''}${time}
                     </small>
                 </div>
            </div>`;
        }).join('');

        if (conversationMessages.length === 0) { messagesHtml = `<p class="text-center text-muted mt-4">${t('noMessagesInConversation', {}, 'Start the conversation!')}</p>`; }

        const contentHtml = `
            <div data-page-title="${t('chatWith', { name: partnerName })}"></div>
            <a href="#messages" class="btn btn-sm btn-outline-secondary mb-3"><i class="bi bi-arrow-left"></i> ${t('backToMessages', {}, 'Back to Inbox')}</a>
            <h3 class="mb-3 border-bottom pb-2">${t('chatWith', { name: partnerName })}</h3>
            <div id="message-list" class="mb-3 p-3 border rounded bg-white shadow-sm" style="height: 60vh; overflow-y: auto; display: flex; flex-direction: column-reverse;">
                 ${messagesHtml}
             </div>
             
             <form id="send-message-form" data-recipient-id="${recipientForSend || ''}">
                 <div id="send-message-form-alert" class="alert d-none mb-2" role="alert"></div>
                 <div class="input-group">
                     <input type="text" id="message-input" class="form-control" placeholder="${t('typeMessagePlaceholder', {}, 'Type your message...')}" required autocomplete="off" ${!recipientForSend ? 'disabled' : ''}>
                     <button class="btn btn-primary" type="submit" id="send-message-button" ${!recipientForSend ? 'disabled' : ''}>
                         <i class="bi bi-send-fill"></i> <span class="d-none d-sm-inline">${t('sendMessageButton', {}, 'Send')}</span>
                     </button>
                 </div>
                  ${!recipientForSend ? `<small class="text-danger d-block mt-1">${t('cannotSendMessage', {}, 'Cannot send message.')}</small>` : ''}
             </form>`;

        console.log("[renderConversationPage] Calling render()...");
        render(contentHtml, false, true); // Not admin-specific, add container
        console.log("[renderConversationPage] render() called.");

        // Auto-scroll
        const messageList = document.getElementById('message-list');
        if (messageList) { messageList.scrollTop = 0; }

        // --- Inline Form Handler ---
        const sendMessageForm = document.getElementById('send-message-form');
        if (sendMessageForm) {
             $(sendMessageForm).off('submit.conversation').on('submit.conversation', function(event) {
                 event.preventDefault();
                 const $form = $(this);
                 if ($form.data('isSubmitting')) return;
                 $form.data('isSubmitting', true);
                 const messageInput = document.getElementById('message-input');
                 const messageContent = messageInput.value.trim();
                 const currentRecipientId = $form.data('recipient-id');
                 $('#send-message-form-alert').addClass('d-none').removeClass('show fade alert-danger alert-success');
                 if (!messageContent) { $form.data('isSubmitting', false); return; }
                 if (!currentUser || !currentUser.id) { $('#send-message-form-alert').text(t('errorGeneric', {}, 'An error occurred.')).addClass('alert-danger').removeClass('d-none').addClass('show fade'); $form.data('isSubmitting', false); return; }
                  if (!currentRecipientId) { $('#send-message-form-alert').text(t('errorSendMessageRecipient', {}, 'Cannot determine message recipient.')).addClass('alert-danger').removeClass('d-none').addClass('show fade'); $form.data('isSubmitting', false); return; }
                 console.log(`[SendMessage] Sending from ${currentUser.id} to ${currentRecipientId}: ${messageContent}`);
                 const sentMessage = store.sendMessage(currentUser.id, currentRecipientId, messageContent);
                 if (sentMessage) { messageInput.value = ''; renderConversationPage(); /* Re-render */ }
                 else { $('#send-message-form-alert').text(t('errorSendMessageFailed', {}, 'Failed to send message.')).addClass('alert-danger').removeClass('d-none').addClass('show fade'); $form.data('isSubmitting', false); }
             });
        } else {
            console.warn("[renderConversationPage] Send message form not found after render.");
        }

    } catch (e) {
        console.error("Error rendering conversation page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
     console.log("[renderConversationPage] Function END");
}