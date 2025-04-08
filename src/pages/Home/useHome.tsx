import { ShellContext } from 'contexts/ShellContext'
import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'

const roomTypePrefixes = ['public', 'private']
const roomTypePrefixesDelimitedForRegExp = roomTypePrefixes.join('|')
const rRoomNameAppPrefix = `^${window.location.origin}/(${roomTypePrefixesDelimitedForRegExp})/`

export const useHome = () => {
  const { setTitle } = useContext(ShellContext)
  const [roomName, setRoomName] = useState(uuid())
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setTitle('Chitchatter')
  }, [setTitle])

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target

    const baseRoomName = value.replace(new RegExp(rRoomNameAppPrefix), '')

    setRoomName(baseRoomName)
  }

  const handleFormSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const handleJoinPublicRoomClick = () => {
    navigate(`/public/${roomName}`)
  }

  const handleJoinPrivateRoomClick = () => {
    navigate(`/private/${roomName}`)
  }

  const handleGetEmbedCodeClick = () => {
    setShowEmbedCode(true)
  }

  const handleEmbedCodeWindowClose = () => {
    setShowEmbedCode(false)
  }

  const isRoomNameValid = roomName.length > 0

  return {
    roomName,
    setRoomName,
    showEmbedCode,
    handleRoomNameChange,
    handleFormSubmit,
    handleJoinPublicRoomClick,
    handleJoinPrivateRoomClick,
    handleGetEmbedCodeClick,
    handleEmbedCodeWindowClose,
    isRoomNameValid,
  }
}
