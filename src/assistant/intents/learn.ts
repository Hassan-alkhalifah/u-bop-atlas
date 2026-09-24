// Lessons, quiz, share link and export: the assistant opens them; the panels do the work.
import { LESSONS } from '../../learn/lessons'
import type { AssistantReply, Intent } from '../types'

const reply = (text: string, commands: AssistantReply['commands'], suggestions?: string[]): AssistantReply => ({ text, commands, suggestions })

const LESSON_WORDS: [RegExp, string][] = [
  [/\btour\b/, 'tour'],
  [/\bseal(s|ing)?\b/, 'sealing'],
  [/\bshear(s|ing)?\b|\bisr\b|\bboosters?\b/, 'shearing'],
  [/\bbonnets?\b|\banatomy\b/, 'bonnet'],
]

export const learn: Intent = ({ t }) => {
  if (/\b(quiz|test me|test my)\b/.test(t)) {
    const mode = /\bname\b/.test(t) ? 'name' : 'find'
    const title = mode === 'name' ? 'Name the part' : 'Find the part'
    return reply(`Starting the "${title}" quiz in the Learn tab: 10 questions from the parts in your current setup.`, [{ type: 'openLearn', quiz: mode }], ['name the part quiz', 'start the tour'])
  }
  if (!/\b(tour|lessons?|learn|teach me|guided|walk me through)\b/.test(t)) return null
  const hit = LESSON_WORDS.find(([rx]) => rx.test(t))
  const lesson = hit ? LESSONS.find((l) => l.id === hit[1]) : undefined
  if (lesson) {
    return reply(`Starting the lesson "${lesson.title}" (${lesson.steps.length} steps) in the Learn tab. Use Next and Back to move through it.`, [{ type: 'openLearn', lessonId: lesson.id }], ['quiz me'])
  }
  return reply(`The Learn tab has ${LESSONS.length} lessons: ${LESSONS.map((l) => `"${l.title}"`).join(', ')}, and two quizzes.`, [{ type: 'openLearn' }], LESSONS.map((l) => `lesson: ${l.title.toLowerCase()}`).slice(0, 3))
}

export const shareExport: Intent = ({ t }) => {
  if (/^(share|copy link|get link|link)\b|\bshare (this|the) (view|link)\b|\blink to (this|the) view\b/.test(t)) {
    return reply('The share link for this exact view is open at the top and copied to the clipboard when the browser allows it.', [{ type: 'openDialog', dialog: 'share' }])
  }
  if (/\b(export|download|excel|xlsx|spreadsheet|print|pdf)\b/.test(t) && !/\bhow\b/.test(t)) {
    return reply('The export window is open: choose what to include, then download an Excel file or print the parts sheet (use "Save as PDF" for a PDF).', [{ type: 'openDialog', dialog: 'export' }])
  }
  return null
}
